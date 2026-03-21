import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CasinoConfigService } from '../casino-config/casino-config.service';
import { CasinoGateway } from '../gateway/casino.gateway';

export type AlertType =
  | 'HIGH_BET'
  | 'CONSECUTIVE_LOSSES'
  | 'CONSECUTIVE_WINS'
  | 'LOW_CASINO_BALANCE'
  | 'NEW_PLAYER'
  | 'FAILED_LOGIN';

export interface AlertPayload {
  type: AlertType;
  message: string;
  username?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

const ALERT_COLORS: Record<AlertType, number> = {
  HIGH_BET: 0xE0A85C,
  CONSECUTIVE_LOSSES: 0xE05C5C,
  CONSECUTIVE_WINS: 0x4CAF7D,
  LOW_CASINO_BALANCE: 0xC62828,
  NEW_PLAYER: 0x5CC8E0,
  FAILED_LOGIN: 0xFF6B6B,
};

const ALERT_ICONS: Record<AlertType, string> = {
  HIGH_BET: '💰',
  CONSECUTIVE_LOSSES: '📉',
  CONSECUTIVE_WINS: '📈',
  LOW_CASINO_BALANCE: '🚨',
  NEW_PLAYER: '🎉',
  FAILED_LOGIN: '🔐',
};

@Injectable()
export class AlertsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly casinoConfigService: CasinoConfigService,
    private readonly gateway: CasinoGateway,
  ) { }

  async trigger(payload: AlertPayload): Promise<void> {
    // Sauvegarde en DB
    await this.prisma.adminAction.create({
      data: {
        adminId: null,
        action: `ALERT_${payload.type}`,
        targetType: 'ALERT',
        targetId: payload.userId || 'SYSTEM',
        metadata: {
          message: payload.message,
          username: payload.username,
          ...payload.metadata,
        },
      },
    });

    this.gateway.notifyAdmins('alert:new', {
      type: payload.type,
      message: payload.message,
      username: payload.username,
      metadata: payload.metadata,
      createdAt: new Date().toISOString(),
    });

    await this.sendDiscordAlert(payload);
  }

  private async sendDiscordAlert(payload: AlertPayload): Promise<void> {
    const webhookUrl = await this.casinoConfigService.get('DISCORD_WEBHOOK_URL');
    if (!webhookUrl) return;

    const icon = ALERT_ICONS[payload.type];
    const color = ALERT_COLORS[payload.type];

    const body = {
      embeds: [{
        title: `${icon} ${payload.type.replace(/_/g, ' ')}`,
        description: payload.message,
        color,
        fields: [
          payload.username ? { name: 'Joueur', value: payload.username, inline: true } : null,
          ...Object.entries(payload.metadata || {}).map(([k, v]) => ({
            name: k, value: String(v), inline: true,
          })),
        ].filter(Boolean),
        footer: { text: 'Bellagio Casino — Système d\'alertes' },
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
      console.error('Erreur envoi Discord:', err);
    }
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
      isRead: false,
    }));
  }

  async checkHighBet(userId: string, username: string, amount: number): Promise<void> {
    const threshold = await this.casinoConfigService.get('ALERT_HIGH_BET_THRESHOLD');
    if (!threshold || amount < parseInt(threshold)) return;

    await this.trigger({
      type: 'HIGH_BET',
      message: `Le joueur **${username}** vient de miser **${amount.toLocaleString()} jetons**.`,
      username,
      userId,
      metadata: { mise: amount, seuil: threshold },
    });
  }

  async checkConsecutiveResults(userId: string, username: string): Promise<void> {
    const lossThreshold = parseInt(await this.casinoConfigService.get('ALERT_CONSECUTIVE_LOSSES') || '5');
    const winThreshold = parseInt(await this.casinoConfigService.get('ALERT_CONSECUTIVE_WINS') || '5');

    const recentRounds = await this.prisma.gameRound.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.max(lossThreshold, winThreshold),
      select: { status: true },
    });

    if (recentRounds.length === 0) return;

    const lastStatuses = recentRounds.map(r => r.status);

    const consecutiveLosses = lastStatuses
      .slice(0, lossThreshold)
      .every(s => s === 'LOST');

    const consecutiveWins = lastStatuses
      .slice(0, winThreshold)
      .every(s => s === 'WON');

    if (consecutiveLosses) {
      await this.trigger({
        type: 'CONSECUTIVE_LOSSES',
        message: `Le joueur **${username}** a enchaîné **${lossThreshold} pertes consécutives**.`,
        username,
        userId,
        metadata: { pertes: lossThreshold },
      });
    }

    if (consecutiveWins) {
      await this.trigger({
        type: 'CONSECUTIVE_WINS',
        message: `Le joueur **${username}** a enchaîné **${winThreshold} gains consécutifs**.`,
        username,
        userId,
        metadata: { gains: winThreshold },
      });
    }
  }

  async checkCasinoBalance(): Promise<void> {
    const threshold = parseInt(
      await this.casinoConfigService.get('ALERT_CASINO_BALANCE_MIN') || '500000'
    );

    const totalBetAgg = await this.prisma.walletTransaction.aggregate({
      _sum: { amount: true },
      where: { type: 'BET' },
    });

    const totalWinAgg = await this.prisma.walletTransaction.aggregate({
      _sum: { amount: true },
      where: { type: 'WIN' },
    });

    const casinoBalance = Number(totalBetAgg._sum.amount || 0) - Number(totalWinAgg._sum.amount || 0);

    if (casinoBalance < threshold) {
      await this.trigger({
        type: 'LOW_CASINO_BALANCE',
        message: `⚠️ Le solde du casino est critique : **${casinoBalance.toLocaleString()} jetons** (seuil : ${threshold.toLocaleString()}).`,
        metadata: { solde: casinoBalance, seuil: threshold },
      });
    }
  }

  async alertNewPlayer(username: string, userId: string): Promise<void> {
    await this.trigger({
      type: 'NEW_PLAYER',
      message: `Nouveau joueur inscrit : **${username}**.`,
      username,
      userId,
    });
  }

  async alertFailedLogin(username: string, failedCount: number): Promise<void> {
    await this.trigger({
      type: 'FAILED_LOGIN',
      message: `Le compte **${username}** a subi **${failedCount} tentatives de connexion échouées**.`,
      username,
      metadata: { tentatives: failedCount },
    });
  }
}