import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) { }

  async getAllUsers() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        role: true,
        status: true,
        createdAt: true,
        wallet: {
          select: { balance: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((u) => ({
      ...u,
      wallet: u.wallet
        ? { balance: Number(u.wallet.balance) }
        : { balance: 0 },
    }));
  }

  async updateUserStatus(userId: string, status: 'ACTIVE' | 'BANNED' | 'SUSPENDED') {
    return this.prisma.user.update({
      where: { id: userId },
      data: { status },
      select: {
        id: true,
        username: true,
        status: true,
      },
    });
  }

  async getGlobalStats() {
    const [
      totalUsers,
      activeUsers,
      totalRounds,
      betsAgg,
      winsAgg,
      jackpotAgg,
      levelAgg,
      adminCreditAgg,
      adminDebitAgg,
      rewardCodesAgg,
      refundAgg,
      raffleTicketAgg,
      raffleWinAgg,
      vipSalesAgg,
      levelIngameValueAgg,
      claimedCustomRaffleTickets,
      roundsByGame,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
      this.prisma.gameRound.count(),
      this.prisma.walletTransaction.aggregate({
        _sum: { amount: true },
        where: { type: 'BET' },
      }),
      this.prisma.walletTransaction.aggregate({
        _sum: { amount: true },
        where: { type: 'WIN' },
      }),
      this.prisma.walletTransaction.aggregate({
        _sum: { amount: true },
        where: { type: 'WIN_JACKPOT' },
      }),
      this.prisma.walletTransaction.aggregate({
        _sum: { amount: true },
        where: { type: 'WIN_LEVEL' },
      }),
      // Tous les crédits admin (monnaie offerte par le casino)
      this.prisma.walletTransaction.aggregate({
        _sum: { amount: true },
        where: { type: 'ADMIN_CREDIT' },
      }),
      // Tous les débits admin (inclut les achats VIP, qu'on isole ensuite)
      this.prisma.walletTransaction.aggregate({
        _sum: { amount: true },
        where: { type: 'ADMIN_DEBIT' },
      }),
      // Sous-ensemble : codes promo (reason préfixé)
      this.prisma.walletTransaction.aggregate({
        _sum: { amount: true },
        where: {
          type: 'ADMIN_CREDIT',
          reason: { startsWith: '🎁 Code promo' },
        },
      }),
      // Remboursements de parties annulées
      this.prisma.walletTransaction.aggregate({
        _sum: { amount: true },
        where: { type: 'REFUND' },
      }),
      // Tombola : ventes de tickets (revenu) et gains jetons (sortie)
      this.prisma.walletTransaction.aggregate({
        _sum: { amount: true },
        where: { type: 'RAFFLE_TICKET' },
      }),
      this.prisma.walletTransaction.aggregate({
        _sum: { amount: true },
        where: { type: 'WIN_RAFFLE' },
      }),
      // Ventes VIP (enregistrées en ADMIN_DEBIT avec reason "Achat VIP")
      this.prisma.walletTransaction.aggregate({
        _sum: { amount: true },
        where: { type: 'ADMIN_DEBIT', reason: { startsWith: 'Achat VIP' } },
      }),
      // Coût RP estimé — lots de niveau remis en jeu (somme des valeurs estimées)
      this.prisma.levelReward.aggregate({
        _sum: { ingameValue: true },
        where: { isIngame: true, ingameClaimed: true },
      }),
      // Coût RP estimé — lots de tombola CUSTOM réclamés (value est un String -> somme côté code)
      this.prisma.raffleTicket.findMany({
        where: { status: 'WON', claimStatus: 'CLAIMED', wonPrize: { type: 'CUSTOM' } },
        select: { wonPrize: { select: { value: true } } },
      }),
      this.prisma.gameRound.groupBy({
        by: ['gameType'],
        _count: { id: true },
      }),
    ]);

    const totalBets = Number(betsAgg._sum.amount || 0);
    const totalWins = Number(winsAgg._sum.amount || 0);
    const totalJackpot = Number(jackpotAgg._sum.amount || 0);
    const totalLevel = Number(levelAgg._sum.amount || 0);
    const totalCredit = Number(adminCreditAgg._sum.amount || 0);
    const totalDebit = Number(adminDebitAgg._sum.amount || 0);
    const totalRewardCodes = Number(rewardCodesAgg._sum.amount || 0);
    const totalRefund = Number(refundAgg._sum.amount || 0);
    const totalRaffleTickets = Number(raffleTicketAgg._sum.amount || 0);
    const totalRaffleWins = Number(raffleWinAgg._sum.amount || 0);
    const totalVipSales = Number(vipSalesAgg._sum.amount || 0);

    // ── Coût RP estimé distribué (informatif, hors jetons) ─────────────────────
    // Lots de niveau remis en jeu :
    const levelRpCost = Number(levelIngameValueAgg._sum.ingameValue || 0);
    // Lots de tombola CUSTOM réclamés (value est un String -> on somme en nombre) :
    const raffleRpCost = claimedCustomRaffleTickets.reduce((sum, t) => {
      const v = Number(t.wonPrize?.value);
      return sum + (Number.isFinite(v) ? v : 0);
    }, 0);
    const totalRpEstimatedCost = levelRpCost + raffleRpCost;

    // Crédits admin "hors codes promo" : monnaie offerte manuellement par le staff.
    const totalAdminCreditOther = totalCredit - totalRewardCodes;

    // ── Compta ───────────────────────────────────────────────────────────────
    // Revenu brut des JEUX uniquement : mises − gains − remboursements.
    const grossRevenue = totalBets - totalWins - totalRefund;

    // Revenus annexes encaissés par le casino : ventes de tickets + ventes VIP.
    const sideIncome = totalRaffleTickets + totalVipSales;

    // Sorties (monnaie versée/offerte par le casino) :
    //   jackpots + récompenses de niveau + gains jetons tombola
    //   + codes promo + crédits admin manuels.
    const payouts =
      totalJackpot +
      totalLevel +
      totalRaffleWins +
      totalRewardCodes +
      totalAdminCreditOther;

    const netRevenue = grossRevenue + sideIncome - payouts;

    return {
      totalUsers,
      activeUsers,
      totalRounds,
      roundsByGame: roundsByGame.map((r) => ({
        gameType: r.gameType,
        count: r._count.id,
      })),
      totalBet: totalBets,
      totalWin: totalWins,
      totalJackpot,
      totalLevel,
      totalCredit,
      totalDebit,
      totalRewardCodes,
      totalRefund,
      totalRaffleTickets,
      totalRaffleWins,
      totalVipSales,
      totalAdminCreditOther,
      levelRpCost,
      raffleRpCost,
      totalRpEstimatedCost,
      grossRevenue,
      sideIncome,
      netRevenue,
      casinoRevenue: netRevenue,
    };
  }

  async getAllTransactions(limit = 50, offset = 0) {
    const transactions = await this.prisma.walletTransaction.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, username: true },
        },
      },
    });

    return transactions.map((t) => ({
      ...t,
      amount: Number(t.amount),
      balanceBefore: Number(t.balanceBefore),
      balanceAfter: Number(t.balanceAfter),
    }));
  }

  async getAllGameRounds(limit = 50, offset = 0, userId?: string) {
    const rounds = await this.prisma.gameRound.findMany({
      take: limit,
      skip: offset,
      where: userId ? { userId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, username: true },
        },
      },
    });

    return rounds.map((r) => ({
      ...r,
      stake: Number(r.stake),
      payout: Number(r.payout),
    }));
  }

  async getUserLoginHistory(userId: string, limit = 20) {
    return this.prisma.loginHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
      },
    });
  }

  async getUserStats(userId: string) {
    const rounds = await this.prisma.gameRound.findMany({
      where: { userId },
    });

    const totalRounds = rounds.length;
    const totalWon = rounds.filter(r => r.status === 'WON').length;
    const totalLost = rounds.filter(r => r.status === 'LOST').length;
    const totalStake = rounds.reduce((acc, r) => acc + Number(r.stake), 0);
    const totalPayout = rounds.reduce((acc, r) => acc + Number(r.payout), 0);

    const byGame = ['SLOTS', 'ROULETTE', 'BLACKJACK'].map((game) => {
      const gameRounds = rounds.filter(r => r.gameType === game);
      return {
        gameType: game,
        total: gameRounds.length,
        won: gameRounds.filter(r => r.status === 'WON').length,
        lost: gameRounds.filter(r => r.status === 'LOST').length,
        stake: gameRounds.reduce((acc, r) => acc + Number(r.stake), 0),
        payout: gameRounds.reduce((acc, r) => acc + Number(r.payout), 0),
      };
    });

    return {
      totalRounds,
      totalWon,
      totalLost,
      winRate: totalRounds > 0 ? Math.round((totalWon / totalRounds) * 100) : 0,
      totalStake,
      totalPayout,
      netResult: totalPayout - totalStake,
      byGame,
    };
  }

  async getLeaderboard() {
    // Top par balance
    const wallets = await this.prisma.wallet.findMany({
      orderBy: { balance: 'desc' },
      take: 10,
      include: {
        user: {
          select: { id: true, username: true, role: true },
        },
      },
    });

    // Top par gains totaux — groupBy sur userId
    const winsByUser = await this.prisma.walletTransaction.groupBy({
      by: ['userId'],
      where: { type: 'WIN' },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 10,
    });

    const byWinsWithUser = await Promise.all(
      winsByUser.map(async (entry) => {
        const user = await this.prisma.user.findUnique({
          where: { id: entry.userId },
          select: { id: true, username: true, role: true },
        });
        return {
          user,
          totalWins: Number(entry._sum.amount ?? 0),
        };
      }),
    );

    // Top par nombre de parties jouées
    const roundsByUser = await this.prisma.gameRound.groupBy({
      by: ['userId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const byRoundsWithUser = await Promise.all(
      roundsByUser.map(async (entry) => {
        const user = await this.prisma.user.findUnique({
          where: { id: entry.userId },
          select: { id: true, username: true, role: true },
        });
        return {
          user,
          totalRounds: entry._count.id,
        };
      }),
    );

    return {
      byBalance: wallets.map((w) => ({
        user: w.user,
        balance: Number(w.balance),
      })),
      byWins: byWinsWithUser,
      byRounds: byRoundsWithUser,
    };
  }

  async getRecentWinners(limit = 10) {
    const wins = await this.prisma.gameRound.findMany({
      where: { status: 'WON' },
      orderBy: { settledAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: { username: true },
        },
      },
    });

    return wins.map((w) => ({
      username: w.user.username,
      gameType: w.gameType,
      payout: Number(w.payout),
      multiplier: w.multiplier,
      settledAt: w.settledAt,
    }));
  }

  async getCasinoBalanceHistory(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const transactions = await this.prisma.walletTransaction.findMany({
      where: {
        type: {
          in: [
            'BET',
            'WIN',
            'WIN_JACKPOT',
            'WIN_LEVEL',
            'WIN_RAFFLE',
            'RAFFLE_TICKET',
            'REFUND',
            'ADMIN_CREDIT',
            'ADMIN_DEBIT',
          ],
        },
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'asc' },
      select: { type: true, amount: true, reason: true, createdAt: true },
    });

    // Pour chaque jour : entrées (mises + ventes tickets + ventes VIP)
    // et sorties (gains jeux + jackpot + niveaux + gains tombola + promo + crédits admin).
    type Day = { bets: number; wins: number; income: number; payouts: number };
    const byDay: Record<string, Day> = {};
    const ensure = (d: string) => (byDay[d] ??= { bets: 0, wins: 0, income: 0, payouts: 0 });

    transactions.forEach((t) => {
      const day = t.createdAt.toISOString().split('T')[0];
      const row = ensure(day);
      const amt = Number(t.amount);
      const reason = t.reason || '';
      const isPromo = reason.startsWith('🎁 Code promo');
      const isVipSale = reason.startsWith('Achat VIP');

      switch (t.type) {
        case 'BET':
          row.bets += amt;
          break;
        case 'WIN':
          row.wins += amt;
          break;
        case 'WIN_JACKPOT':
        case 'WIN_LEVEL':
        case 'WIN_RAFFLE':
          row.payouts += amt;
          break;
        case 'REFUND':
          // un remboursement annule une mise encaissée
          row.payouts += amt;
          break;
        case 'RAFFLE_TICKET':
          row.income += amt;
          break;
        case 'ADMIN_DEBIT':
          if (isVipSale) row.income += amt; // vente VIP = revenu
          break;
        case 'ADMIN_CREDIT':
          row.payouts += amt; // promo ou crédit manuel = monnaie offerte
          break;
      }
    });

    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const day = date.toISOString().split('T')[0];
      const d = byDay[day] || { bets: 0, wins: 0, income: 0, payouts: 0 };
      // Revenu net du jour = (mises − gains jeux) + revenus annexes − sorties
      const revenue = d.bets - d.wins + d.income - d.payouts;
      result.push({
        date: day,
        bets: d.bets,
        wins: d.wins,
        revenue,
      });
    }

    return result;
  }

  async getGameRoundsHistory(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const rounds = await this.prisma.gameRound.findMany({
      where: { createdAt: { gte: since } },
      select: { gameType: true, status: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    type DayRow = { SLOTS: number; ROULETTE: number; BLACKJACK: number; BATTLE_BOX: number; total: number };
    const empty = (): DayRow => ({ SLOTS: 0, ROULETTE: 0, BLACKJACK: 0, BATTLE_BOX: 0, total: 0 });
    const byDay: Record<string, DayRow> = {};

    rounds.forEach((r) => {
      const day = r.createdAt.toISOString().split('T')[0];
      if (!byDay[day]) byDay[day] = empty();
      const key = r.gameType as keyof Omit<DayRow, 'total'>;
      if (key in byDay[day]) byDay[day][key]++;
      byDay[day].total++;
    });

    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const day = date.toISOString().split('T')[0];
      const data = byDay[day] || empty();
      result.push({ date: day, ...data });
    }

    return result;
  }

  // ── Répartition du CA par jeu (camembert) ────────────────────────────────────
  // CA d'un jeu = somme des mises − somme des gains (sur GameRound).
  async getRevenueByGame(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const grouped = await this.prisma.gameRound.groupBy({
      by: ['gameType'],
      where: { createdAt: { gte: since }, status: { in: ['WON', 'LOST'] } },
      _sum: { stake: true, payout: true },
      _count: { id: true },
    });

    return grouped.map((g) => {
      const staked = Number(g._sum.stake || 0);
      const paid = Number(g._sum.payout || 0);
      return {
        gameType: g.gameType,
        rounds: g._count.id,
        staked,
        paid,
        revenue: staked - paid,
      };
    });
  }

  // ── Ventes de tickets de tombola par jour ────────────────────────────────────
  async getRaffleSalesHistory(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const tickets = await this.prisma.raffleTicket.findMany({
      where: { purchasedAt: { gte: since } },
      select: { purchasedAt: true },
      orderBy: { purchasedAt: 'asc' },
    });

    const byDay: Record<string, number> = {};
    tickets.forEach((t) => {
      const day = t.purchasedAt.toISOString().split('T')[0];
      byDay[day] = (byDay[day] || 0) + 1;
    });

    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const day = date.toISOString().split('T')[0];
      result.push({ date: day, tickets: byDay[day] || 0 });
    }
    return result;
  }

  // ── Nouveaux inscrits par jour ───────────────────────────────────────────────
  async getSignupsHistory(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const users = await this.prisma.user.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const byDay: Record<string, number> = {};
    users.forEach((u) => {
      const day = u.createdAt.toISOString().split('T')[0];
      byDay[day] = (byDay[day] || 0) + 1;
    });

    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const day = date.toISOString().split('T')[0];
      result.push({ date: day, signups: byDay[day] || 0 });
    }
    return result;
  }

  // ── Abonnements VIP vendus par jour ──────────────────────────────────────────
  async getVipSalesHistory(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const subs = await this.prisma.vipSubscription.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, price: true },
      orderBy: { createdAt: 'asc' },
    });

    const byDay: Record<string, { count: number; revenue: number }> = {};
    subs.forEach((s) => {
      const day = s.createdAt.toISOString().split('T')[0];
      if (!byDay[day]) byDay[day] = { count: 0, revenue: 0 };
      byDay[day].count++;
      byDay[day].revenue += Number(s.price);
    });

    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const day = date.toISOString().split('T')[0];
      const d = byDay[day] || { count: 0, revenue: 0 };
      result.push({ date: day, count: d.count, revenue: d.revenue });
    }
    return result;
  }

  async createAuditLog(
    adminId: string,
    action: string,
    targetType: string,
    targetId: string,
    metadata?: object,
  ) {
    await this.prisma.adminAction.create({
      data: {
        adminId,
        action,
        targetType,
        targetId,
        metadata: metadata ?? {},
      },
    });
  }

  async getAuditLogs(limit = 50, offset = 0) {
    const logs = await this.prisma.adminAction.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        admin: {
          select: { id: true, username: true },
        },
      },
    });

    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId,
      metadata: log.metadata,
      createdAt: log.createdAt,
      admin: log.admin ?? { id: 'system', username: 'Système' },
    }));
  }

  async getAlerts(limit = 50) {
    const logs = await this.prisma.adminAction.findMany({
      where: { action: { startsWith: 'ALERT_' } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs.map((log) => ({
      id: log.id,
      type: log.action.replace('ALERT_', ''),
      message: (log.metadata as Record<string, unknown>)?.message || '',
      username: (log.metadata as Record<string, unknown>)?.username || null,
      metadata: log.metadata,
      createdAt: log.createdAt,
    }));
  }

  async updateUserRole(userId: string, role: 'ADMIN' | 'PLAYER' | 'VIP') {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, username: true, role: true },
    });
  }

  async deleteUser(adminId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    await this.prisma.user.delete({ where: { id: userId } });

    return { message: `Compte de ${user.username} supprimé définitivement.` };
  }


  async anonymizeUser(adminId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const metadata = user.metadata as any;
    if (metadata?.anonymized) {
      throw new BadRequestException('Ce compte est déjà anonymisé.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        username: `anon_${userId.slice(0, 8)}`,
        firstName: '[Anonymisé]',
        lastName: '[Anonymisé]',
        phoneNumber: `00000-${userId.slice(0, 5)}`,
        discordId: null,
        discordUsername: null,
        passwordHash: await argon2.hash(randomUUID()),
        metadata: {
          anonymized: true,
          originalData: {
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            phoneNumber: user.phoneNumber,
          },
        },
      },
    });

    await this.createAuditLog(adminId, 'USER_ANONYMIZED', 'USER', userId, {});
    return { message: 'Compte anonymisé avec succès.' };
  }

  async deanonymizeUser(adminId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const metadata = user.metadata as any;
    if (!metadata?.anonymized || !metadata?.originalData) {
      throw new BadRequestException('Ce compte n\'est pas anonymisé.');
    }

    const { username, firstName, lastName, phoneNumber } = metadata.originalData;

    await this.prisma.user.update({
      where: { id: userId },
      data: { username, firstName, lastName, phoneNumber, metadata: {} },
    });

    await this.createAuditLog(adminId, 'USER_DEANONYMIZED', 'USER', userId, {});
    return { message: 'Compte désanonymisé avec succès.' };
  }

  async resetPassword(adminId: string, userId: string): Promise<{ message: string; newPassword: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const newPassword = Math.random().toString(36).slice(-8).toUpperCase() +
      Math.random().toString(36).slice(-4);
    const passwordHash = await argon2.hash(newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await this.createAuditLog(adminId, 'PASSWORD_RESET', 'USER', userId, {});
    return {
      message: `Mot de passe réinitialisé pour ${user.username}.`,
      newPassword,
    };
  }
}