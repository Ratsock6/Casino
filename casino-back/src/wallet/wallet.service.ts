import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  WalletTransactionType,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CasinoGateway } from '../gateway/casino.gateway';

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: CasinoGateway,
  ) { }

  async adminCredit(adminId: string, userId: string, amount: number, reason?: string) {
    if (amount <= 0) throw new BadRequestException('Amount must be greater than 0');

    const result = await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) throw new NotFoundException('Wallet not found');

      const balanceBefore = wallet.balance;
      const balanceAfter = balanceBefore + BigInt(amount);

      await tx.wallet.update({ where: { userId }, data: { balance: balanceAfter } });

      const walletTx = await tx.walletTransaction.create({ // 👈 sauvegarde la variable
        data: {
          userId,
          type: WalletTransactionType.ADMIN_CREDIT,
          amount: BigInt(amount),
          balanceBefore,
          balanceAfter,
          reason: reason ?? 'Admin credit',
          adminId: adminId === 'SYSTEM' ? null : adminId,
        },
      });

      await tx.adminAction.create({
        data: {
          adminId: adminId === 'SYSTEM' ? null : adminId,
          action: 'ADMIN_CREDIT',
          targetType: 'WALLET',
          targetId: wallet.id,
          metadata: {
            userId,
            amount,
            reason: reason ?? 'Admin credit',
            walletTransactionId: walletTx.id, // 👈
          },
        },
      });

      return {
        message: 'Wallet credited successfully',
        transactionId: walletTx.id, // 👈
        userId,
        amount,
        balanceBefore: balanceBefore.toString(),
        balanceAfter: balanceAfter.toString(),
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    this.gateway.notifyUser(userId, 'wallet:credited', {
      amount,
      newBalance: result.balanceAfter,
      reason: reason ?? 'Admin credit',
      message: `💰 +${amount.toLocaleString()} jetons ont été ajoutés à votre compte.`,
    });

    return result;
  }

  async adminDebit(adminId: string, userId: string, amount: number, reason?: string) {
    if (amount <= 0) throw new BadRequestException('Amount must be greater than 0');

    const result = await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) throw new NotFoundException('Wallet not found');

      const balanceBefore = wallet.balance;
      if (balanceBefore < BigInt(amount)) throw new BadRequestException('Insufficient wallet balance');

      const balanceAfter = balanceBefore - BigInt(amount);

      await tx.wallet.update({ where: { userId }, data: { balance: balanceAfter } });

      const transaction = await tx.walletTransaction.create({
        data: {
          userId,
          type: WalletTransactionType.ADMIN_DEBIT,
          amount: BigInt(amount),
          balanceBefore,
          balanceAfter,
          reason: reason ?? 'Admin debit',
          adminId,
        },
      });

      await tx.adminAction.create({
        data: {
          adminId: adminId === 'SYSTEM' ? null : adminId,
          action: 'ADMIN_DEBIT',
          targetType: 'WALLET',
          targetId: wallet.id,
          metadata: { userId, amount, reason: reason ?? 'Admin debit', walletTransactionId: transaction.id },
        },
      });

      return {
        message: 'Wallet debited successfully',
        transactionId: transaction.id,
        userId,
        amount,
        balanceBefore: balanceBefore.toString(),
        balanceAfter: balanceAfter.toString(),
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    // Notification temps réel au joueur
    this.gateway.notifyUser(userId, 'wallet:debited', {
      amount,
      newBalance: result.balanceAfter,
      reason: reason ?? 'Admin debit',
      message: `💸 -${amount.toLocaleString()} jetons ont été retirés de votre compte.`,
    });

    return result;
  }

  async getWalletHistory(userId: string, limit = 20, isAdmin = false) {
    let safeLimit = Math.max(1, Math.min(limit, 1000));
    if (isAdmin) {
      safeLimit = limit;
    }

    const transactions = await this.prisma.walletTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: safeLimit,
    });

    return transactions.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: tx.amount.toString(),
      balanceBefore: tx.balanceBefore.toString(),
      balanceAfter: tx.balanceAfter.toString(),
      reason: tx.reason,
      gameType: tx.gameType,
      gameRoundId: tx.gameRoundId,
      adminId: tx.adminId,
      createdAt: tx.createdAt,
    }));
  }

  async getWalletByUserId(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return {
      id: wallet.id,
      userId: wallet.userId,
      balance: wallet.balance.toString(),
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }
}