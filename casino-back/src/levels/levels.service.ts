import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VipService } from '../vip/vip.service';
import { CasinoConfigService } from '../casino-config/casino-config.service';

// XP requis pour atteindre le niveau N
export const xpForLevel = (level: number): bigint => {
  if (level <= 0) return BigInt(100);
  if (level >= 100) return BigInt(1_000_000_000);
  return BigInt(100) * BigInt(level) * BigInt(level);
};

// Récompenses par niveau
const LEVEL_REWARDS: Record<number, {
  tokens?: number;
  vipDuration?: string;
  badge?: string;
  ingame?: string;
  ingameValue?: number; // valeur estimée en jetons du lot RP (compta informative)
  description: string;
}> = {
  0: { tokens: 0, description: 'Niveau 0' },
  1: { tokens: 1000, description: '1 000 jetons' },
  2: { tokens: 1500, description: '1 500 jetons' },
  3: { tokens: 2000, description: '2 000 jetons' },
  4: { tokens: 2500, description: '2 500 jetons' },
  5: { tokens: 3000, description: '3 000 jetons' },
  6: { tokens: 3500, description: '3 500 jetons' },
  7: { tokens: 4000, description: '4 000 jetons' },
  8: { tokens: 4500, description: '4 500 jetons' },
  9: { tokens: 5000, description: '5 000 jetons' },
  10: { tokens: 6000, description: '6 000 jetons' },
  11: { tokens: 7000, description: '7 000 jetons' },
  12: { tokens: 8000, description: '8 000 jetons' },
  13: { tokens: 9000, description: '9 000 jetons' },
  14: { tokens: 10000, description: '10 000 jetons' },
  15: { tokens: 11000, description: '11 000 jetons' },
  16: { tokens: 12000, description: '12 000 jetons' },
  17: { tokens: 13000, description: '13 000 jetons' },
  18: { tokens: 14000, description: '14 000 jetons' },
  19: { tokens: 15000, description: '15 000 jetons' },
  20: { ingame: 'Sultan RS', ingameValue: 875000, description: '🏎️ Sultan RS — à récupérer en jeu' },
  21: { tokens: 17000, description: '17 000 jetons' },
  22: { tokens: 18000, description: '18 000 jetons' },
  23: { tokens: 19000, description: '19 000 jetons' },
  24: { tokens: 20000, description: '20 000 jetons' },
  25: { tokens: 75000, badge: '🥈 Argent', description: '75 000 jetons + Badge 🥈 Argent' },
  26: { tokens: 22000, description: '22 000 jetons' },
  27: { tokens: 23000, description: '23 000 jetons' },
  28: { tokens: 24000, description: '24 000 jetons' },
  29: { tokens: 25000, description: '25 000 jetons' },
  30: { ingame: 'Pfister Comet 5', ingameValue: 1200000, description: '🏎️ Pfister Comet 5 — à récupérer en jeu' },
  31: { tokens: 30000, description: '30 000 jetons' },
  32: { tokens: 32000, description: '32 000 jetons' },
  33: { tokens: 34000, description: '34 000 jetons' },
  34: { tokens: 36000, description: '36 000 jetons' },
  35: { tokens: 38000, description: '38 000 jetons' },
  36: { tokens: 40000, description: '40 000 jetons' },
  37: { tokens: 42000, description: '42 000 jetons' },
  38: { tokens: 44000, description: '44 000 jetons' },
  39: { tokens: 46000, description: '46 000 jetons' },
  40: { ingame: 'Carbonizzare', ingameValue: 1562000, description: '🏎️ Carbonizzare — à récupérer en jeu' },
  41: { tokens: 50000, description: '50 000 jetons' },
  42: { tokens: 52000, description: '52 000 jetons' },
  43: { tokens: 54000, description: '54 000 jetons' },
  44: { tokens: 56000, description: '56 000 jetons' },
  45: { tokens: 58000, description: '58 000 jetons' },
  46: { tokens: 60000, description: '60 000 jetons' },
  47: { tokens: 62000, description: '62 000 jetons' },
  48: { tokens: 64000, description: '64 000 jetons' },
  49: { tokens: 66000, description: '66 000 jetons' },
  50: { tokens: 300000, badge: '🥇 Or', vipDuration: '1_MONTH', description: '300 000 jetons + Badge 🥇 Or + VIP 1 mois' },
  51: { tokens: 70000, description: '70 000 jetons' },
  52: { tokens: 72000, description: '72 000 jetons' },
  53: { tokens: 74000, description: '74 000 jetons' },
  54: { tokens: 76000, description: '76 000 jetons' },
  55: { tokens: 78000, description: '78 000 jetons' },
  56: { tokens: 80000, description: '80 000 jetons' },
  57: { tokens: 82000, description: '82 000 jetons' },
  58: { tokens: 84000, description: '84 000 jetons' },
  59: { tokens: 86000, description: '86 000 jetons' },
  60: { ingame: 'Elegy', ingameValue: 2000000, description: '🏎️ Elegy — à récupérer en jeu' },
  61: { tokens: 90000, description: '90 000 jetons' },
  62: { tokens: 94000, description: '94 000 jetons' },
  63: { tokens: 98000, description: '98 000 jetons' },
  64: { tokens: 102000, description: '102 000 jetons' },
  65: { tokens: 106000, description: '106 000 jetons' },
  66: { tokens: 110000, description: '110 000 jetons' },
  67: { tokens: 114000, description: '114 000 jetons' },
  68: { tokens: 118000, description: '118 000 jetons' },
  69: { tokens: 122000, description: '122 000 jetons' },
  70: { ingame: 'Cheetah', ingameValue: 2800000, description: '🏎️ Cheetah — à récupérer en jeu' },
  71: { tokens: 130000, description: '130 000 jetons' },
  72: { tokens: 135000, description: '135 000 jetons' },
  73: { tokens: 140000, description: '140 000 jetons' },
  74: { tokens: 145000, description: '145 000 jetons' },
  75: { tokens: 750000, badge: '💎 Platine', vipDuration: '3_MONTHS', description: '750 000 jetons + Badge 💎 Platine + VIP 3 mois' },
  76: { tokens: 150000, description: '150 000 jetons' },
  77: { tokens: 155000, description: '155 000 jetons' },
  78: { tokens: 160000, description: '160 000 jetons' },
  79: { tokens: 165000, description: '165 000 jetons' },
  80: { ingame: 'Turismo R', ingameValue: 12000000, description: '🏎️ Turismo R — à récupérer en jeu' },
  81: { tokens: 175000, description: '175 000 jetons' },
  82: { tokens: 180000, description: '180 000 jetons' },
  83: { tokens: 185000, description: '185 000 jetons' },
  84: { tokens: 190000, description: '190 000 jetons' },
  85: { tokens: 195000, description: '195 000 jetons' },
  86: { tokens: 200000, description: '200 000 jetons' },
  87: { tokens: 205000, description: '205 000 jetons' },
  88: { tokens: 210000, description: '210 000 jetons' },
  89: { tokens: 215000, description: '215 000 jetons' },
  90: { ingame: 'Zentorno', ingameValue: 15000000, description: '🏎️ Zentorno — à récupérer en jeu' },
  91: { tokens: 250000, description: '250 000 jetons' },
  92: { tokens: 265000, description: '265 000 jetons' },
  93: { tokens: 280000, description: '280 000 jetons' },
  94: { tokens: 295000, description: '295 000 jetons' },
  95: { tokens: 310000, description: '310 000 jetons' },
  96: { tokens: 325000, description: '325 000 jetons' },
  97: { tokens: 340000, description: '340 000 jetons' },
  98: { tokens: 355000, description: '355 000 jetons' },
  99: { tokens: 150000, badge: '🌟 Diamant', vipDuration: '6_MONTHS', description: '150 000 jetons + Badge 🌟 Diamant + VIP 6 mois' },
  100: { tokens: 200000, badge: '👑 Légendaire', vipDuration: 'LIFETIME', ingame: 'AMG GTC', ingameValue: 35000000, description: '200 000 jetons + Badge 👑 Légendaire + VIP à vie + 🏆 AMG GTC — à récupérer en jeu' },
};

@Injectable()
export class LevelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vipService: VipService,
    private readonly casinoConfigService: CasinoConfigService,
  ) { }

  // Calcule l'XP gagné pour une partie
  calculateXp(stake: number): number {
    const participationBonus = 50;
    const stakeXp = Math.floor(stake / 100);
    return stakeXp + participationBonus;
  }

  // Ajoute l'XP après une partie
  async addXp(userId: string, stake: number): Promise<{
    leveledUp: boolean;
    newLevel?: number;
    xpGained: number;
    reward?: typeof LEVEL_REWARDS[number];
  }> {
    // Mise minimale pour gagner de l'XP (anti-farm de niveaux avec des micro-mises).
    // Configurable via CasinoConfig : XP_MIN_STAKE (défaut 500 jetons).
    const minStake = await this.casinoConfigService.getNumber('XP_MIN_STAKE', 500);
    if (stake < minStake) {
      return { leveledUp: false, xpGained: 0 };
    }

    const xpGained = this.calculateXp(stake);

    // Récupère ou crée le niveau du joueur
    let playerLevel = await this.prisma.playerLevel.upsert({
      where: { userId },
      update: {},
      create: { userId, level: 0, currentXp: 0, totalXp: 0 },
    });

    const newTotalXp = playerLevel.totalXp + BigInt(xpGained);
    let newCurrentXp = playerLevel.currentXp + BigInt(xpGained);
    let newLevel = playerLevel.level;
    let leveledUp = false;
    let reward = null;

    // Vérifie si le joueur monte de niveau
    if (newLevel < 100) {
      const xpNeeded = xpForLevel(newLevel + 1);
      if (newCurrentXp >= xpNeeded) {
        newLevel++;
        newCurrentXp -= xpNeeded;
        leveledUp = true;
        reward = LEVEL_REWARDS[newLevel];

        // Attribue la récompense
        if (reward) {
          await this.grantReward(userId, newLevel, reward);
        }
      }
    }

    // Met à jour le niveau
    await this.prisma.playerLevel.update({
      where: { userId },
      data: {
        level: newLevel,
        currentXp: newCurrentXp,
        totalXp: newTotalXp,
      },
    });

    return { leveledUp, newLevel: leveledUp ? newLevel : undefined, xpGained, reward: reward ?? undefined };
  }

  private async grantReward(
    userId: string,
    level: number,
    reward: typeof LEVEL_REWARDS[number],
  ) {
    await this.prisma.levelReward.create({
      data: {
        userId,
        level,
        rewardType: reward.ingame ? 'INGAME' : reward.badge ? 'BADGE' : reward.vipDuration ? 'VIP' : 'TOKENS',
        rewardValue: reward.description,
        isIngame: !!reward.ingame,
        ingameValue: reward.ingameValue ?? null,
        ingameClaimed: false,
        claimed: false,
      },
    });
  }

  async claimReward(userId: string, rewardId: string) {
    const reward = await this.prisma.levelReward.findUnique({
      where: { id: rewardId },
    });

    if (!reward) throw new Error('Récompense introuvable');
    if (reward.userId !== userId) throw new Error('Cette récompense ne vous appartient pas');
    if (reward.claimed) throw new Error('Cette récompense a déjà été réclamée');
    if (reward.isIngame) throw new Error('Les lots in-game sont récupérés en jeu');

    const rewardDef = LEVEL_REWARDS[reward.level];
    if (!rewardDef) throw new Error('Définition de récompense introuvable');

    if (rewardDef.tokens) {
      const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
      if (!wallet) throw new Error('Wallet introuvable');

      const balanceBefore = wallet.balance;
      const balanceAfter = balanceBefore + BigInt(rewardDef.tokens);

      await this.prisma.wallet.update({
        where: { userId },
        data: { balance: balanceAfter },
      });

      await this.prisma.walletTransaction.create({
        data: {
          userId,
          type: 'WIN_LEVEL',
          amount: BigInt(rewardDef.tokens),
          balanceBefore,
          balanceAfter,
          reason: `🎉 Récompense niveau ${reward.level} réclamée`,
        },
      });
    }

    if (rewardDef.vipDuration) {
      await this.vipService.adminGrantVip(
        'SYSTEM',
        userId,
        rewardDef.vipDuration as any,
      );
    }

    await this.prisma.levelReward.update({
      where: { id: rewardId },
      data: { claimed: true },
    });

    return {
      message: `✅ Récompense réclamée : ${rewardDef.description}`,
      tokens: rewardDef.tokens || 0,
    };
  }

  async getUnclaimedRewards(userId: string) {
    const rewards = await this.prisma.levelReward.findMany({
      where: { userId, claimed: false, isIngame: false },
      orderBy: { level: 'asc' },
    });

    return rewards.map((r) => ({
      id: r.id,
      level: r.level,
      rewardType: r.rewardType,
      rewardValue: r.rewardValue,
      claimedAt: r.claimedAt,
    }));
  }

  async getMyLevel(userId: string) {
    const playerLevel = await this.prisma.playerLevel.findUnique({
      where: { userId },
      include: {
        rewards: {
          orderBy: { claimedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!playerLevel) {
      return {
        level: 0,
        currentXp: 0,
        totalXp: 0,
        xpForNextLevel: Number(xpForLevel(1)),
        progressPercent: 0,
        rewards: [],
      };
    }

    const nextLevel = Math.min(playerLevel.level + 1, 100);
    const xpNeeded = Number(xpForLevel(nextLevel));
    const currentXp = Number(playerLevel.currentXp);
    const progressPercent = playerLevel.level >= 100
      ? 100
      : Math.min(Math.floor((currentXp / xpNeeded) * 100), 100);

    return {
      level: playerLevel.level,
      currentXp,
      totalXp: Number(playerLevel.totalXp),
      xpForNextLevel: xpNeeded,
      progressPercent,
      rewards: playerLevel.rewards,
      nextReward: LEVEL_REWARDS[nextLevel] || null,
    };
  }

  async getLeaderboard() {
    const levels = await this.prisma.playerLevel.findMany({
      orderBy: [{ level: 'desc' }, { totalXp: 'desc' }],
      take: 20,
      include: {
        user: { select: { username: true, role: true } },
      },
    });

    return levels.map((l, i) => ({
      rank: i + 1,
      username: l.user.username,
      role: l.user.role,
      level: l.level,
      totalXp: Number(l.totalXp),
    }));
  }

  // Récupère les récompenses disponibles (pour l'affichage)
  getRewardsTable() {
    return Object.entries(LEVEL_REWARDS).map(([level, reward]) => ({
      level: parseInt(level),
      ...reward,
    }));
  }

  // Liste tous les lots in-game en attente
  async getPendingIngameRewards() {
    const rewards = await this.prisma.levelReward.findMany({
      where: { isIngame: true, ingameClaimed: false },
      orderBy: { claimedAt: 'asc' },
      include: {
        playerLevel: {
          include: {
            user: { select: { username: true, firstName: true, lastName: true, phoneNumber: true } },
          },
        },
      },
    });

    return rewards.map((r) => ({
      id: r.id,
      level: r.level,
      rewardValue: r.rewardValue,
      claimedAt: r.claimedAt,
      user: r.playerLevel.user,
    }));
  }

  // Valide un lot in-game
  async claimIngameReward(rewardId: string, adminId: string) {
    const reward = await this.prisma.levelReward.findUnique({
      where: { id: rewardId },
    });

    if (!reward) throw new Error('Récompense introuvable');
    if (reward.ingameClaimed) throw new Error('Cette récompense a déjà été récupérée');

    return this.prisma.levelReward.update({
      where: { id: rewardId },
      data: {
        ingameClaimed: true,
        ingameClaimedAt: new Date(),
        ingameClaimedBy: adminId,
      },
    });
  }

  async getAllIngameRewards() {
    const rewards = await this.prisma.levelReward.findMany({
      where: { isIngame: true },
      orderBy: { claimedAt: 'desc' },
      include: {
        playerLevel: {
          include: {
            user: { select: { username: true, firstName: true, lastName: true, phoneNumber: true } },
          },
        },
      },
    });

    return rewards.map((r) => ({
      id: r.id,
      level: r.level,
      rewardValue: r.rewardValue,
      claimedAt: r.claimedAt,
      ingameClaimed: r.ingameClaimed,
      ingameClaimedAt: r.ingameClaimedAt,
      user: r.playerLevel.user,
    }));
  }
}