import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CasinoConfigService } from '../casino-config/casino-config.service';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly casinoConfigService: CasinoConfigService,
  ) { }

  // Tous les jours à 8h00
  @Cron('0 8 * * *')
  async sendDailyReport() {
    this.logger.log('Envoi du rapport journalier Discord...');

    const webhookUrl = await this.casinoConfigService.get('DISCORD_WEBHOOK_URL');
    if (!webhookUrl) {
      this.logger.warn('Pas de webhook Discord configuré — rapport annulé');
      return;
    }

    const report = await this.buildDailyReport();
    await this.sendToDiscord(webhookUrl, report);

    this.logger.log('Rapport journalier envoyé avec succès');
  }

  async buildDailyReport() {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - 1); // Hier

    const until = new Date();
    until.setHours(0, 0, 0, 0);

    // Nouvelles inscriptions
    const newPlayers = await this.prisma.user.count({
      where: { createdAt: { gte: since, lt: until } },
    });

    // Parties jouées
    const totalRounds = await this.prisma.gameRound.count({
      where: { createdAt: { gte: since, lt: until } },
    });

    // Parties par jeu
    const roundsByGame = await this.prisma.gameRound.groupBy({
      by: ['gameType'],
      where: { createdAt: { gte: since, lt: until } },
      _count: { id: true },
    });

    // Mises et gains
    const betsAgg = await this.prisma.walletTransaction.aggregate({
      _sum: { amount: true },
      where: { type: 'BET', createdAt: { gte: since, lt: until } },
    });

    const winsAgg = await this.prisma.walletTransaction.aggregate({
      _sum: { amount: true },
      where: { type: 'WIN', createdAt: { gte: since, lt: until } },
    });

    // Joueurs actifs
    const activePlayers = await this.prisma.gameRound.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: since, lt: until } },
    });

    // Connexions
    const logins = await this.prisma.loginHistory.count({
      where: { createdAt: { gte: since, lt: until } },
    });

    // Solde total casino
    const totalBetsAllTime = await this.prisma.walletTransaction.aggregate({
      _sum: { amount: true },
      where: { type: 'BET' },
    });

    const totalWinsAllTime = await this.prisma.walletTransaction.aggregate({
      _sum: { amount: true },
      where: { type: 'WIN' },
    });

    const rewardCodesAgg = await this.prisma.walletTransaction.aggregate({
      _sum: { amount: true },
      where: {
        type: 'ADMIN_CREDIT',
        reason: { startsWith: '🎁 Code promo' },
        createdAt: { gte: since, lt: until },
      },
    });

    const totalRewardCodes = Number(rewardCodesAgg._sum.amount || 0);

    const [totalWinAgg, jackpotAgg, levelAgg] = await Promise.all([
      this.prisma.walletTransaction.aggregate({
        _sum: { amount: true },
        where: { type: 'WIN', createdAt: { gte: since, lt: until } },
      }),
      this.prisma.walletTransaction.aggregate({
        _sum: { amount: true },
        where: { type: 'WIN_JACKPOT', createdAt: { gte: since, lt: until } },
      }),
      this.prisma.walletTransaction.aggregate({
        _sum: { amount: true },
        where: { type: 'WIN_LEVEL', createdAt: { gte: since, lt: until } },
      }),

    ]);

    const totalBets = Number(betsAgg._sum.amount || 0);
    const totalWins = Number(winsAgg._sum.amount || 0);
    const revenue = totalBets - totalWins - totalRewardCodes;
    const casinoBalance = Number(totalBetsAllTime._sum.amount || 0) - Number(totalWinsAllTime._sum.amount || 0);
    const totalJackpot = Number(jackpotAgg._sum.amount || 0);
    const totalLevel = Number(levelAgg._sum.amount || 0);
    const grossRevenue = totalBets - totalWins;

    const date = since.toLocaleDateString('fr-FR', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    });

    return {
      date,
      newPlayers,
      totalRounds,
      roundsByGame,
      totalBets,
      totalWins,
      revenue,
      activePlayers: activePlayers.length,
      logins,
      casinoBalance,
      totalJackpot,
      totalLevel,
      grossRevenue,
    };
  }

  private async sendToDiscord(webhookUrl: string, report: Awaited<ReturnType<typeof this.buildDailyReport>>) {
    const GAME_ICONS: Record<string, string> = {
      SLOTS: '🎰', ROULETTE: '🎡', BLACKJACK: '🃏', BATTLE_BOX: '🎮',
    };

    const roundsByGameText = report.roundsByGame
      .map((g) => `${GAME_ICONS[g.gameType] || '🎮'} **${g.gameType}** : ${g._count.id} parties`)
      .join('\n') || 'Aucune partie';

    const revenueColor = report.revenue >= 0 ? 0x4CAF7D : 0xE05C5C;
    const revenueEmoji = report.revenue >= 0 ? '📈' : '📉';
    const casinoBalanceEmoji = report.casinoBalance >= 0 ? '🟢' : '🔴';

    const body = {
      embeds: [{
        title: `📊 Rapport Journalier — ${report.date}`,
        color: revenueColor,
        fields: [
          {
            name: '👥 Joueurs',
            value: [
              `Nouveaux inscrits : **${report.newPlayers}**`,
              `Joueurs actifs : **${report.activePlayers}**`,
              `Connexions : **${report.logins}**`,
            ].join('\n'),
            inline: true,
          },
          {
            name: '🎮 Parties',
            value: `Total : **${report.totalRounds}**\n${roundsByGameText}`,
            inline: true,
          },
          {
            name: '\u200b',
            value: '\u200b',
            inline: false,
          },
          {
            name: '💰 Finances du jour',
            value: [
              `Total misé : **${report.totalBets.toLocaleString()} 🪙**`,
              `Total gagné : **${report.totalWins.toLocaleString()} 🪙**`,
              `${revenueEmoji} Revenu net : **${report.revenue >= 0 ? '+' : ''}${report.revenue.toLocaleString()} 🪙**`,
              `Jackpots : **${report.totalJackpot.toLocaleString()} 🪙**`,
              `Niveaux : **${report.totalLevel.toLocaleString()} 🪙**`,
              `Revenu brut : **${report.grossRevenue.toLocaleString()} 🪙**`,
              `${casinoBalanceEmoji} Solde casino : **${report.casinoBalance.toLocaleString()} 🪙**`,
            ].join('\n'),
            inline: true,
          },
          {
            name: '🏦 Solde casino (total)',
            value: `**${report.casinoBalance.toLocaleString()} 🪙**`,
            inline: true,
          },
        ],
        footer: {
          text: 'Bellagio Casino — Rapport automatique',
        },
        timestamp: new Date().toISOString(),
      }],
    };

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (err) {
      this.logger.error('Erreur envoi rapport Discord:', err);
    }
  }

  // Méthode pour déclencher manuellement depuis l'admin
  async triggerManualReport() {
    const webhookUrl = await this.casinoConfigService.get('DISCORD_WEBHOOK_URL');
    if (!webhookUrl) throw new Error('Pas de webhook Discord configuré');

    const report = await this.buildDailyReport();
    await this.sendToDiscord(webhookUrl, report);
    return { success: true, message: 'Rapport envoyé sur Discord' };
  }
}