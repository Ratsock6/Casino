import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

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

  async getAllGameRounds(limit = 50, offset = 0) {
    const rounds = await this.prisma.gameRound.findMany({
      take: limit,
      skip: offset,
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
}