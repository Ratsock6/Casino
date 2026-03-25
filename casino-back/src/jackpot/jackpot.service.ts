import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CasinoConfigService } from '../casino-config/casino-config.service';

@Injectable()
export class JackpotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly casinoConfigService: CasinoConfigService,
  ) { }


  private async calculateMinAmount(): Promise<number> {
    const floor = parseInt(
      await this.casinoConfigService.get('JACKPOT_MIN_AMOUNT') || '100000'
    );

    const pct = parseFloat(
      await this.casinoConfigService.get('JACKPOT_MIN_PCT') || '2'
    );

    // Calcule le revenu net du casino
    const betsAgg = await this.prisma.walletTransaction.aggregate({
      _sum: { amount: true },
      where: { type: 'BET' },
    });

    const winsAgg = await this.prisma.walletTransaction.aggregate({
      _sum: { amount: true },
      where: { type: 'WIN' },
    });

    const netRevenue = Number(betsAgg._sum.amount || 0) - Number(winsAgg._sum.amount || 0);
    const calculated = Math.floor(netRevenue * pct / 100);

    // Retourne le max entre le plancher et le calculé
    return Math.max(floor, calculated);
  }

  // Récupère le jackpot actuel
  async getJackpot() {
    const jackpot = await this.prisma.jackpot.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return {
      amount: Number(jackpot?.amount || 0),
      lastWonAt: jackpot?.lastWonAt || null,
      lastWonAmount: Number(jackpot?.lastWonAmount || 0),
    };
  }

  // Appelé après chaque partie — contribue et vérifie si gagné
  async processJackpot(
    userId: string,
    username: string,
    stake: number,
    gameType: string,
  ): Promise<{ won: boolean; amount?: number }> {

    // Vérifie si le jackpot est activé
    const enabled = await this.casinoConfigService.getBoolean('JACKPOT_ENABLED', false);
    if (!enabled) return { won: false };

    const contributionPct = parseFloat(
      await this.casinoConfigService.get('JACKPOT_CONTRIBUTION_PCT') || '1'
    );
    const winProbability = parseInt(
      await this.casinoConfigService.get('JACKPOT_WIN_PROBABILITY') || '10000'
    );
    const minAmount = parseInt(
      await this.casinoConfigService.get('JACKPOT_MIN_AMOUNT') || '100000'
    );

    const contribution = Math.floor(stake * contributionPct / 100);

    return this.prisma.$transaction(async (tx) => {
      const jackpot = await tx.jackpot.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });

      if (!jackpot) return { won: false };

      // Ajoute la contribution
      const newAmount = jackpot.amount + BigInt(contribution);

      // Vérifie si le joueur gagne
      const roll = Math.floor(Math.random() * winProbability);
      const won = roll === 0;

      const minStake = parseInt(
        await this.casinoConfigService.get('JACKPOT_MIN_STAKE') || '5000'
      );

      if (stake < minStake) {
        const contribution = Math.floor(stake * contributionPct / 100);
        if (contribution > 0) {
          await this.prisma.jackpot.updateMany({
            where: { isActive: true },
            data: { amount: { increment: BigInt(contribution) } },
          });
        }
        return { won: false };
      }

      if (won) {
        const wonAmount = Number(newAmount);
        const newMinAmount = await this.calculateMinAmount();

        await tx.jackpot.update({
          where: { id: jackpot.id },
          data: {
            amount: BigInt(newMinAmount),
            lastWonAt: new Date(),
            lastWonBy: username,
            lastWonAmount: newAmount,
          },
        });

        // Crédite le joueur
        const wallet = await tx.wallet.findUnique({ where: { userId } });
        if (wallet) {
          await tx.wallet.update({
            where: { userId },
            data: { balance: { increment: newAmount } },
          });

          await tx.walletTransaction.create({
            data: {
              userId,
              type: 'WIN_JACKPOT',
              amount: newAmount,
              balanceBefore: wallet.balance,
              balanceAfter: wallet.balance + newAmount,
              reason: `🎰 JACKPOT PROGRESSIF REMPORTÉ !`,
            },
          });
        }

        // Enregistre le gain
        await tx.jackpotWin.create({
          data: { userId, amount: newAmount, gameType },
        });

        // Log d'audit
        await tx.adminAction.create({
          data: {
            adminId: null,
            action: 'JACKPOT_WIN',
            targetType: 'USER',
            targetId: userId,
            metadata: {
              username,
              amount: wonAmount,
              gameType,
              probability: `1/${winProbability}`,
            },
          },
        });

        return { won: true, amount: wonAmount };
      } else {
        // Juste mettre à jour la cagnotte
        await tx.jackpot.update({
          where: { id: jackpot.id },
          data: { amount: newAmount },
        });
        return { won: false };
      }
    });
  }

  // Historique des gains jackpot
  async getJackpotHistory(limit = 10) {
    const wins = await this.prisma.jackpotWin.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { username: true, firstName: true, lastName: true } },
      },
    });

    return wins.map((w) => ({
      username: w.user.username,
      firstName: w.user.firstName,
      lastName: w.user.lastName,
      amount: Number(w.amount),
      gameType: w.gameType,
      createdAt: w.createdAt,
    }));
  }

  // Réinitialise manuellement le jackpot (admin)
  async resetJackpot(adminId: string) {
    const minAmount = await this.calculateMinAmount();

    await this.prisma.jackpot.updateMany({
      where: { isActive: true },
      data: { amount: BigInt(minAmount) },
    });

    await this.prisma.adminAction.create({
      data: {
        adminId,
        action: 'JACKPOT_RESET',
        targetType: 'JACKPOT',
        targetId: 'global',
        metadata: { newAmount: minAmount },
      },
    });

    return { message: `Jackpot réinitialisé à ${minAmount.toLocaleString()} jetons.` };
  }
}