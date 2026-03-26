import { Controller, Get, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CasinoConfigService } from '../casino-config/casino-config.service';


@Controller('public')
export class PublicController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly casinoConfigService: CasinoConfigService,
  ) { }

  @Get('recent-winners')
  async getRecentWinners() {
    const wins = await this.prisma.gameRound.findMany({
      where: { status: 'WON', payout: { gt: 0 } },
      orderBy: { settledAt: 'desc' },
      take: 10,
      include: {
        user: { select: { username: true } },
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

  @Get('stats')
  async getPublicStats() {
    const enabled = await this.casinoConfigService.getBoolean('ENABLE_PUBLIC_STATS', true);
    if (!enabled) throw new ForbiddenException('Public stats are disabled');

    const [totalUsers, totalRounds, totalWinAgg] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.gameRound.count(),
      this.prisma.walletTransaction.aggregate({
        _sum: { amount: true },
        where: { type: 'WIN' },
      }),
    ]);

    return {
      totalUsers,
      totalRounds,
      totalPaidOut: Number(totalWinAgg._sum.amount || 0),
    };
  }

  @Get('maintenance')
  async getMaintenance() {
    const [global, slots, roulette, blackjack] = await Promise.all([
      this.casinoConfigService.getBoolean('MAINTENANCE_GLOBAL', false),
      this.casinoConfigService.getBoolean('MAINTENANCE_SLOTS', false),
      this.casinoConfigService.getBoolean('MAINTENANCE_ROULETTE', false),
      this.casinoConfigService.getBoolean('MAINTENANCE_BLACKJACK', false),
    ]);

    return { global, SLOTS: slots, ROULETTE: roulette, BLACKJACK: blackjack };
  }

  @Get('jackpot-status')
  async getJackpotStatus() {
    const enabled = await this.casinoConfigService.getBoolean('JACKPOT_ENABLED', false);
    return { enabled };
  }

  @Get('battlebox-status')
  async getBattleBoxStatus() {
    const enabled = await this.casinoConfigService.getBoolean('BATTLEBOX_ENABLED', true);
    return { enabled };
  }

  @Get('battlebox-max-bet')
  async getBattleBoxMaxBetVip() {
    const maxBetVip = await this.casinoConfigService.getNumber('BATTLEBOX_MAX_STAKE_VIP', 100000);
    const maxBetPlayer = await this.casinoConfigService.getNumber('BATTLEBOX_MAX_STAKE_PLAYER', 50000);
    return { 
      maxBetPlayer,
      maxBetVip,
    };
  }

}