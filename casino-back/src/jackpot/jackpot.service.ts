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

    // Plafond du plancher auto-calculé : évite que le jackpot offert au reset
    // ne s'emballe quand le revenu du casino grandit.
    const cap = parseInt(
      await this.casinoConfigService.get('JACKPOT_MIN_CAP') || '500000'
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

    // Plancher final = au moins le minimum fixe, au plus le plafond.
    return Math.min(Math.max(floor, calculated), cap);
  }

  // Récupère le jackpot actuel
  async getJackpot() {
    let jackpot = await this.prisma.jackpot.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    // Crée le jackpot s'il n'existe pas
    if (!jackpot) {
      const minAmount = await this.calculateMinAmount();
      jackpot = await this.prisma.jackpot.create({
        data: {
          amount: BigInt(minAmount),
          isActive: true,
        },
      });
    }

    return {
      amount: Number(jackpot.amount),
      lastWonAt: jackpot.lastWonAt || null,
      lastWonAmount: Number(jackpot.lastWonAmount || 0),
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
    const minStake = parseInt(
      await this.casinoConfigService.get('JACKPOT_MIN_STAKE') || '5000'
    );

    // Contribution de cette mise à la cagnotte (toujours prélevée, même si la
    // mise est sous le seuil d'éligibilité au gain).
    const contribution = Math.floor(stake * contributionPct / 100);

    return this.prisma.$transaction(async (tx) => {
      // Récupère (ou crée) le jackpot actif
      let jackpot = await tx.jackpot.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });
      if (!jackpot) {
        const seed = await this.calculateMinAmount();
        jackpot = await tx.jackpot.create({
          data: { amount: BigInt(seed), isActive: true },
        });
      }

      // La cagnotte après ajout de la contribution de cette mise.
      const amountWithContribution = jackpot.amount + BigInt(contribution);

      // ── Mise sous le seuil : on contribue mais on NE PEUT PAS gagner ──
      if (stake < minStake) {
        await tx.jackpot.update({
          where: { id: jackpot.id },
          data: { amount: amountWithContribution },
        });
        return { won: false };
      }

      // ── Mise éligible : tirage de victoire ──
      const won = Math.floor(Math.random() * winProbability) === 0;

      if (!won) {
        // Pas gagné : on enregistre juste la contribution.
        await tx.jackpot.update({
          where: { id: jackpot.id },
          data: { amount: amountWithContribution },
        });
        return { won: false };
      }

      // ── GAGNÉ : le joueur remporte la cagnotte (contribution incluse) ──
      const wonAmount = amountWithContribution;
      const seedAmount = await this.calculateMinAmount();

      // Réinitialise la cagnotte au plancher (plafonné)
      await tx.jackpot.update({
        where: { id: jackpot.id },
        data: {
          amount: BigInt(seedAmount),
          lastWonAt: new Date(),
          lastWonBy: username,
          lastWonAmount: wonAmount,
        },
      });

      // Crédite le joueur
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (wallet) {
        await tx.wallet.update({
          where: { userId },
          data: { balance: { increment: wonAmount } },
        });

        await tx.walletTransaction.create({
          data: {
            userId,
            type: 'WIN_JACKPOT',
            amount: wonAmount,
            balanceBefore: wallet.balance,
            balanceAfter: wallet.balance + wonAmount,
            gameType,
            reason: `🎰 JACKPOT PROGRESSIF REMPORTÉ !`,
          },
        });
      }

      // Enregistre le gain
      await tx.jackpotWin.create({
        data: { userId, amount: wonAmount, gameType },
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
            amount: Number(wonAmount),
            gameType,
            probability: `1/${winProbability}`,
          },
        },
      });

      return { won: true, amount: Number(wonAmount) };
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