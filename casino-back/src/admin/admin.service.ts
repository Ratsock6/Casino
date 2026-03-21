import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
    const [totalUsers, totalRounds] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.gameRound.count(),
    ]);

    const totalBetAgg = await this.prisma.walletTransaction.aggregate({
      _sum: { amount: true },
      where: { type: 'BET' },
    });

    const totalWinAgg = await this.prisma.walletTransaction.aggregate({
      _sum: { amount: true },
      where: { type: 'WIN' },
    });

    const roundsByGame = await this.prisma.gameRound.groupBy({
      by: ['gameType'],
      _count: { id: true },
    });

    const totalBet = Number(totalBetAgg._sum.amount || 0);
    const totalWin = Number(totalWinAgg._sum.amount || 0);
    const casinoRevenue = totalBet - totalWin;

    return {
      totalUsers,
      totalRounds,
      totalBet,
      totalWin,
      casinoRevenue,
      roundsByGame: roundsByGame.map((r) => ({
        gameType: r.gameType,
        count: r._count.id,
      })),
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
}