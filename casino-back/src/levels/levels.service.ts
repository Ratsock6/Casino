import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VipService } from '../vip/vip.service';

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
  description: string;
}> = {
  0: { tokens: 0, description: 'Niveau 0' },
  1: { tokens: 100, description: '100 jetons' },
  2: { tokens: 150, description: '150 jetons' },
  3: { tokens: 200, description: '200 jetons' },
  4: { tokens: 250, description: '250 jetons' },
  5: { tokens: 300, description: '300 jetons' },
  6: { tokens: 400, description: '400 jetons' },
  7: { tokens: 500, description: '500 jetons' },
  8: { tokens: 600, description: '600 jetons' },
  9: { tokens: 700, description: '700 jetons' },
  10: { tokens: 1500, description: '1500 jetons' },
  11: { tokens: 800, description: '800 jetons' },
  12: { tokens: 900, description: '900 jetons' },
  13: { tokens: 1000, description: '1 000 jetons' },
  14: { tokens: 1100, description: '1 100 jetons' },
  15: { tokens: 1200, description: '1 200 jetons' },
  16: { tokens: 1300, description: '1 300 jetons' },
  17: { tokens: 1400, description: '1 400 jetons' },
  18: { tokens: 1500, description: '1 500 jetons' },
  19: { tokens: 1600, description: '1 600 jetons' },
  20: { ingame: 'Tenue exclusive Bellagio Casino', description: '🎁 Tenue exclusive Bellagio Casino — à récupérer en jeu' },
  21: { tokens: 1700, description: '1 700 jetons' },
  22: { tokens: 1800, description: '1 800 jetons' },
  23: { tokens: 1900, description: '1 900 jetons' },
  24: { tokens: 2000, description: '2 000 jetons' },
  25: { tokens: 7500, badge: '🥈 Argent', description: '7500 jetons + Badge Argent 🥈' },
  26: { tokens: 2200, description: '2 200 jetons' },
  27: { tokens: 2400, description: '2 400 jetons' },
  28: { tokens: 2600, description: '2 600 jetons' },
  29: { tokens: 2800, description: '2 800 jetons' },
  30: { ingame: 'Véhicule de luxe — Benefactor Schafter', description: '🚗 Véhicule de luxe Benefactor Schafter — à récupérer en jeu' },
  31: { tokens: 3200, description: '3 200 jetons' },
  32: { tokens: 3400, description: '3 400 jetons' },
  33: { tokens: 3600, description: '3 600 jetons' },
  34: { tokens: 3800, description: '3 800 jetons' },
  35: { tokens: 4000, description: '4 000 jetons' },
  36: { tokens: 4200, description: '4 200 jetons' },
  37: { tokens: 4400, description: '4 400 jetons' },
  38: { tokens: 4600, description: '4 600 jetons' },
  39: { tokens: 4800, description: '4 800 jetons' },
  40: { ingame: 'Appartement au centre-ville', description: '🏠 Appartement au centre-ville — à récupérer en jeu' },
  41: { tokens: 5200, description: '5 200 jetons' },
  42: { tokens: 5400, description: '5 400 jetons' },
  43: { tokens: 5600, description: '5 600 jetons' },
  44: { tokens: 5800, description: '5 800 jetons' },
  45: { tokens: 6000, description: '6 000 jetons' },
  46: { tokens: 6200, description: '6 200 jetons' },
  47: { tokens: 6400, description: '6 400 jetons' },
  48: { tokens: 6600, description: '6 600 jetons' },
  49: { tokens: 6800, description: '6 800 jetons' },
  50: { tokens: 300000, badge: '🥇 Or', vipDuration: '1_MONTH', description: '300 000 jetons + Badge Or 🥇 + VIP 1 mois' },
  51: { tokens: 7000, description: '7 000 jetons' },
  52: { tokens: 7200, description: '7 200 jetons' },
  53: { tokens: 7400, description: '7 400 jetons' },
  54: { tokens: 7600, description: '7 600 jetons' },
  55: { tokens: 7800, description: '7 800 jetons' },
  56: { tokens: 8000, description: '8 000 jetons' },
  57: { tokens: 8200, description: '8 200 jetons' },
  58: { tokens: 8400, description: '8 400 jetons' },
  59: { tokens: 8600, description: '8 600 jetons' },
  60: { ingame: 'Moto Pegassi Bati 801', description: '🏍️ Moto Pegassi Bati 801 — à récupérer en jeu' },
  61: { tokens: 9200, description: '9 200 jetons' },
  62: { tokens: 9400, description: '9 400 jetons' },
  63: { tokens: 9600, description: '9 600 jetons' },
  64: { tokens: 9800, description: '9 800 jetons' },
  65: { tokens: 10000, description: '10 000 jetons' },
  66: { tokens: 10500, description: '10 500 jetons' },
  67: { tokens: 11000, description: '11 000 jetons' },
  68: { tokens: 11500, description: '11 500 jetons' },
  69: { tokens: 12000, description: '12 000 jetons' },
  70: { ingame: 'Villa en bord de mer', description: '🏖️ Villa en bord de mer — à récupérer en jeu' },
  71: { tokens: 13000, description: '13 000 jetons' },
  72: { tokens: 13500, description: '13 500 jetons' },
  73: { tokens: 14000, description: '14 000 jetons' },
  74: { tokens: 14500, description: '14 500 jetons' },
  75: { tokens: 750000, badge: '💎 Platine', vipDuration: '3_MONTHS', description: '750 000 jetons + Badge Platine 💎 + VIP 3 mois' },
  76: { tokens: 15000, description: '15 000 jetons' },
  77: { tokens: 15500, description: '15 500 jetons' },
  78: { tokens: 16000, description: '16 000 jetons' },
  79: { tokens: 16500, description: '16 500 jetons' },
  80: { ingame: 'Jet privé Buckingham Luxor', description: '✈️ Jet privé Buckingham Luxor — à récupérer en jeu' },
  81: { tokens: 17500, description: '17 500 jetons' },
  82: { tokens: 18000, description: '18 000 jetons' },
  83: { tokens: 18500, description: '18 500 jetons' },
  84: { tokens: 19000, description: '19 000 jetons' },
  85: { tokens: 19500, description: '19 500 jetons' },
  86: { tokens: 20000, description: '20 000 jetons' },
  87: { tokens: 21000, description: '21 000 jetons' },
  88: { tokens: 22000, description: '22 000 jetons' },
  89: { tokens: 23000, description: '23 000 jetons' },
  90: { ingame: 'Penthouse au Maze Bank Tower', description: '🏙️ Penthouse au Maze Bank Tower — à récupérer en jeu' },
  91: { tokens: 25000, description: '25 000 jetons' },
  92: { tokens: 26000, description: '26 000 jetons' },
  93: { tokens: 27000, description: '27 000 jetons' },
  94: { tokens: 28000, description: '28 000 jetons' },
  95: { tokens: 29000, description: '29 000 jetons' },
  96: { tokens: 30000, description: '30 000 jetons' },
  97: { tokens: 40000, description: '40 000 jetons' },
  98: { tokens: 50000, description: '50 000 jetons' },
  99: { tokens: 1500000, badge: '🌟 Diamant', vipDuration: '6_MONTHS', description: '1 500 000 jetons + Badge Diamant 🌟 + VIP 6 mois' },
  100: { tokens: 2000000, badge: '👑 Légendaire', vipDuration: 'LIFETIME', ingame: 'Supercar Truffade Adder + Manoir privé', description: '2 000 000 jetons + Badge Légendaire 👑 + VIP À vie + 🏆 Supercar Truffade Adder + Manoir privé — à récupérer en jeu' },
};

@Injectable()
export class LevelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vipService: VipService,
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