import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GameRoundsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyRounds(userId: string, limit = 50) {
    const rounds = await this.prisma.gameRound.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return rounds.map((r) => ({
      id: r.id,
      gameType: r.gameType,
      status: r.status,
      stake: Number(r.stake),
      payout: Number(r.payout),
      multiplier: r.multiplier,
      createdAt: r.createdAt,
    }));
  }

  async getMyStats(userId: string) {
    const rounds = await this.prisma.gameRound.findMany({
      where: { userId },
    });

    const totalRounds = rounds.length;
    const totalWon = rounds.filter(r => r.status === 'WON').length;
    const totalLost = rounds.filter(r => r.status === 'LOST').length;
    const totalStake = rounds.reduce((acc, r) => acc + Number(r.stake), 0);
    const totalPayout = rounds.reduce((acc, r) => acc + Number(r.payout), 0);

    // Par jeu
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
}