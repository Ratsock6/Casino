import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  GameRoundStatus,
  Prisma,
  WalletTransactionType,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  JsonObject,
  PlaceBetInput,
  RefundBetInput,
  SettleLossInput,
  SettleWinInput,
} from './types/bet.types';
import { AlertsService } from '../alerts/alerts.service';



@Injectable()
export class BetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alertsService: AlertsService,
  ) { }

  private toInputJsonValue(data?: JsonObject | null): Prisma.InputJsonValue | undefined {
    if (!data) {
      return undefined;
    }

    return data as Prisma.InputJsonValue;
  }

  async placeBet(input: PlaceBetInput) {
    const { userId, gameType, amount, metadata } = input;

    if (!Number.isInteger(amount) || amount <= 0) {
      throw new BadRequestException('Bet amount must be a positive integer');
    }

    return this.prisma.$transaction(
      async (tx) => {

        const existingPendingRound = await tx.gameRound.findFirst({
          where: {
            userId,
            gameType,
            status: GameRoundStatus.PENDING,
          },
        });

        if (existingPendingRound) {
          throw new BadRequestException(
            `A ${gameType} round is already pending for this user`,
          );
        }
        const wallet = await tx.wallet.findUnique({
          where: { userId },
        });

        if (!wallet) {
          throw new NotFoundException('Wallet not found');
        }

        const balanceBefore = wallet.balance;
        const betAmount = BigInt(amount);

        if (balanceBefore < betAmount) {
          throw new BadRequestException('Insufficient wallet balance');
        }

        const balanceAfter = balanceBefore - betAmount;

        await tx.wallet.update({
          where: { userId },
          data: {
            balance: balanceAfter,
          },
        });

        const round = await tx.gameRound.create({
          data: {
            userId,
            gameType,
            stake: betAmount,
            metadata: this.toInputJsonValue(metadata),
          },
        });

        await tx.walletTransaction.create({
          data: {
            userId,
            type: WalletTransactionType.BET,
            amount: betAmount,
            balanceBefore,
            balanceAfter,
            gameType,
            gameRoundId: round.id,
            reason: `${gameType} bet`,
          },
        });

        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { username: true },
        });
        if (user) {
          await this.alertsService.checkHighBet(userId, user.username, amount);
        }

        return {
          roundId: round.id,
          userId,
          gameType,
          amount,
          balanceBefore: balanceBefore.toString(),
          balanceAfter: balanceAfter.toString(),
          status: round.status,
          createdAt: round.createdAt,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  async settleWin(input: SettleWinInput) {
    const { roundId, payout, multiplier, metadata } = input;

    if (!Number.isInteger(payout) || payout < 0) {
      throw new BadRequestException('Payout must be a non-negative integer');
    }

    return this.prisma.$transaction(
      async (tx) => {
        const round = await tx.gameRound.findUnique({
          where: { id: roundId },
        });

        if (!round) {
          throw new NotFoundException('Game round not found');
        }

        if (round.status !== GameRoundStatus.PENDING) {
          throw new BadRequestException('Game round already settled');
        }

        const wallet = await tx.wallet.findUnique({
          where: { userId: round.userId },
        });

        if (!wallet) {
          throw new NotFoundException('Wallet not found');
        }

        const balanceBefore = wallet.balance;
        const payoutAmount = BigInt(payout);
        const balanceAfter = balanceBefore + payoutAmount;

        await tx.wallet.update({
          where: { userId: round.userId },
          data: {
            balance: balanceAfter,
          },
        });

        const existingMetadata =
          round.metadata && typeof round.metadata === 'object' && !Array.isArray(round.metadata)
            ? (round.metadata as JsonObject)
            : {};

        const mergedMetadata: JsonObject = {
          ...existingMetadata,
          ...(metadata ?? {}),
        };

        await tx.gameRound.update({
          where: { id: round.id },
          data: {
            status: GameRoundStatus.WON,
            payout: payoutAmount,
            multiplier,
            settledAt: new Date(),
            metadata: this.toInputJsonValue(mergedMetadata),
          },
        });

        await tx.walletTransaction.create({
          data: {
            userId: round.userId,
            type: WalletTransactionType.WIN,
            amount: payoutAmount,
            balanceBefore,
            balanceAfter,
            gameType: round.gameType,
            gameRoundId: round.id,
            reason: `${round.gameType} win`,
          },
        });

        const user = await this.prisma.user.findUnique({
          where: { id: round.userId },
          select: { username: true },
        });
        if (user) {
          await this.alertsService.checkConsecutiveResults(round.userId, user.username);
          await this.alertsService.checkCasinoBalance();
        }

        return {
          roundId: round.id,
          status: GameRoundStatus.WON,
          payout,
          balanceBefore: balanceBefore.toString(),
          balanceAfter: balanceAfter.toString(),
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  async settleLoss(input: SettleLossInput) {
    const { roundId, metadata } = input;

    return this.prisma.$transaction(
      async (tx) => {
        const round = await tx.gameRound.findUnique({
          where: { id: roundId },
        });

        if (!round) {
          throw new NotFoundException('Game round not found');
        }

        if (round.status !== GameRoundStatus.PENDING) {
          throw new BadRequestException('Game round already settled');
        }

        const existingMetadata =
          round.metadata && typeof round.metadata === 'object' && !Array.isArray(round.metadata)
            ? (round.metadata as JsonObject)
            : {};

        const mergedMetadata: JsonObject = {
          ...existingMetadata,
          ...(metadata ?? {}),
        };

        const updatedRound = await tx.gameRound.update({
          where: { id: round.id },
          data: {
            status: GameRoundStatus.LOST,
            payout: BigInt(0),
            settledAt: new Date(),
            metadata: this.toInputJsonValue(mergedMetadata),
          },
        });

        const user = await this.prisma.user.findUnique({
          where: { id: round.userId },
          select: { username: true },
        });
        if (user) {
          await this.alertsService.checkConsecutiveResults(round.userId, user.username);
        }

        return {
          roundId: updatedRound.id,
          status: updatedRound.status,
          payout: '0',
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  async refundBet(input: RefundBetInput) {
    const { roundId, reason, metadata } = input;

    return this.prisma.$transaction(
      async (tx) => {
        const round = await tx.gameRound.findUnique({
          where: { id: roundId },
        });

        if (!round) {
          throw new NotFoundException('Game round not found');
        }

        if (round.status !== GameRoundStatus.PENDING) {
          throw new BadRequestException('Only pending rounds can be refunded');
        }

        const wallet = await tx.wallet.findUnique({
          where: { userId: round.userId },
        });

        if (!wallet) {
          throw new NotFoundException('Wallet not found');
        }

        const balanceBefore = wallet.balance;
        const refundAmount = round.stake;
        const balanceAfter = balanceBefore + refundAmount;

        await tx.wallet.update({
          where: { userId: round.userId },
          data: {
            balance: balanceAfter,
          },
        });

        const existingMetadata =
          round.metadata && typeof round.metadata === 'object' && !Array.isArray(round.metadata)
            ? (round.metadata as JsonObject)
            : {};

        const mergedMetadata: JsonObject = {
          ...existingMetadata,
          ...(metadata ?? {}),
          refundReason: reason ?? 'Refund',
        };

        await tx.gameRound.update({
          where: { id: round.id },
          data: {
            status: GameRoundStatus.REFUNDED,
            payout: refundAmount,
            settledAt: new Date(),
            metadata: this.toInputJsonValue(mergedMetadata),
          },
        });

        await tx.walletTransaction.create({
          data: {
            userId: round.userId,
            type: WalletTransactionType.REFUND,
            amount: refundAmount,
            balanceBefore,
            balanceAfter,
            gameType: round.gameType,
            gameRoundId: round.id,
            reason: reason ?? `${round.gameType} refund`,
          },
        });

        return {
          roundId: round.id,
          status: GameRoundStatus.REFUNDED,
          refundedAmount: refundAmount.toString(),
          balanceBefore: balanceBefore.toString(),
          balanceAfter: balanceAfter.toString(),
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  async getRoundById(roundId: string) {
    const round = await this.prisma.gameRound.findUnique({
      where: { id: roundId },
    });

    if (!round) {
      throw new NotFoundException('Game round not found');
    }

    return {
      ...round,
      stake: round.stake.toString(),
      payout: round.payout.toString(),
    };
  }

}