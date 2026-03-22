import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
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
  1: { tokens: 1000, description: '1 000 jetons' },
  2: { tokens: 1500, description: '1 500 jetons' },
  3: { tokens: 2000, description: '2 000 jetons' },
  4: { tokens: 2500, description: '2 500 jetons' },
  5: { tokens: 3000, description: '3 000 jetons' },
  6: { tokens: 4000, description: '4 000 jetons' },
  7: { tokens: 5000, description: '5 000 jetons' },
  8: { tokens: 6000, description: '6 000 jetons' },
  9: { tokens: 7000, description: '7 000 jetons' },
  10: { tokens: 15000, description: '15 000 jetons' },
  11: { tokens: 8000, description: '8 000 jetons' },
  12: { tokens: 9000, description: '9 000 jetons' },
  13: { tokens: 10000, description: '10 000 jetons' },
  14: { tokens: 11000, description: '11 000 jetons' },
  15: { tokens: 12000, description: '12 000 jetons' },
  16: { tokens: 13000, description: '13 000 jetons' },
  17: { tokens: 14000, description: '14 000 jetons' },
  18: { tokens: 15000, description: '15 000 jetons' },
  19: { tokens: 16000, description: '16 000 jetons' },
  20: { ingame: 'Tenue exclusive Bellagio Casino', description: '🎁 Tenue exclusive Bellagio Casino — à récupérer en jeu' },
  21: { tokens: 17000, description: '17 000 jetons' },
  22: { tokens: 18000, description: '18 000 jetons' },
  23: { tokens: 19000, description: '19 000 jetons' },
  24: { tokens: 20000, description: '20 000 jetons' },
  25: { tokens: 75000, badge: '🥈 Argent', description: '75 000 jetons + Badge Argent 🥈' },
  26: { tokens: 22000, description: '22 000 jetons' },
  27: { tokens: 24000, description: '24 000 jetons' },
  28: { tokens: 26000, description: '26 000 jetons' },
  29: { tokens: 28000, description: '28 000 jetons' },
  30: { ingame: 'Véhicule de luxe — Benefactor Schafter', description: '🚗 Véhicule de luxe Benefactor Schafter — à récupérer en jeu' },
  31: { tokens: 32000, description: '32 000 jetons' },
  32: { tokens: 34000, description: '34 000 jetons' },
  33: { tokens: 36000, description: '36 000 jetons' },
  34: { tokens: 38000, description: '38 000 jetons' },
  35: { tokens: 40000, description: '40 000 jetons' },
  36: { tokens: 42000, description: '42 000 jetons' },
  37: { tokens: 44000, description: '44 000 jetons' },
  38: { tokens: 46000, description: '46 000 jetons' },
  39: { tokens: 48000, description: '48 000 jetons' },
  40: { ingame: 'Appartement au centre-ville', description: '🏠 Appartement au centre-ville — à récupérer en jeu' },
  41: { tokens: 52000, description: '52 000 jetons' },
  42: { tokens: 54000, description: '54 000 jetons' },
  43: { tokens: 56000, description: '56 000 jetons' },
  44: { tokens: 58000, description: '58 000 jetons' },
  45: { tokens: 60000, description: '60 000 jetons' },
  46: { tokens: 62000, description: '62 000 jetons' },
  47: { tokens: 64000, description: '64 000 jetons' },
  48: { tokens: 66000, description: '66 000 jetons' },
  49: { tokens: 68000, description: '68 000 jetons' },
  50: { tokens: 300000, badge: '🥇 Or', vipDuration: '1_MONTH', description: '300 000 jetons + Badge Or 🥇 + VIP 1 mois' },
  51: { tokens: 70000, description: '70 000 jetons' },
  52: { tokens: 72000, description: '72 000 jetons' },
  53: { tokens: 74000, description: '74 000 jetons' },
  54: { tokens: 76000, description: '76 000 jetons' },
  55: { tokens: 78000, description: '78 000 jetons' },
  56: { tokens: 80000, description: '80 000 jetons' },
  57: { tokens: 82000, description: '82 000 jetons' },
  58: { tokens: 84000, description: '84 000 jetons' },
  59: { tokens: 86000, description: '86 000 jetons' },
  60: { ingame: 'Moto Pegassi Bati 801', description: '🏍️ Moto Pegassi Bati 801 — à récupérer en jeu' },
  61: { tokens: 92000, description: '92 000 jetons' },
  62: { tokens: 94000, description: '94 000 jetons' },
  63: { tokens: 96000, description: '96 000 jetons' },
  64: { tokens: 98000, description: '98 000 jetons' },
  65: { tokens: 100000, description: '100 000 jetons' },
  66: { tokens: 105000, description: '105 000 jetons' },
  67: { tokens: 110000, description: '110 000 jetons' },
  68: { tokens: 115000, description: '115 000 jetons' },
  69: { tokens: 120000, description: '120 000 jetons' },
  70: { ingame: 'Villa en bord de mer', description: '🏖️ Villa en bord de mer — à récupérer en jeu' },
  71: { tokens: 130000, description: '130 000 jetons' },
  72: { tokens: 135000, description: '135 000 jetons' },
  73: { tokens: 140000, description: '140 000 jetons' },
  74: { tokens: 145000, description: '145 000 jetons' },
  75: { tokens: 750000, badge: '💎 Platine', vipDuration: '3_MONTHS', description: '750 000 jetons + Badge Platine 💎 + VIP 3 mois' },
  76: { tokens: 150000, description: '150 000 jetons' },
  77: { tokens: 155000, description: '155 000 jetons' },
  78: { tokens: 160000, description: '160 000 jetons' },
  79: { tokens: 165000, description: '165 000 jetons' },
  80: { ingame: 'Jet privé Buckingham Luxor', description: '✈️ Jet privé Buckingham Luxor — à récupérer en jeu' },
  81: { tokens: 175000, description: '175 000 jetons' },
  82: { tokens: 180000, description: '180 000 jetons' },
  83: { tokens: 185000, description: '185 000 jetons' },
  84: { tokens: 190000, description: '190 000 jetons' },
  85: { tokens: 195000, description: '195 000 jetons' },
  86: { tokens: 200000, description: '200 000 jetons' },
  87: { tokens: 210000, description: '210 000 jetons' },
  88: { tokens: 220000, description: '220 000 jetons' },
  89: { tokens: 230000, description: '230 000 jetons' },
  90: { ingame: 'Penthouse au Maze Bank Tower', description: '🏙️ Penthouse au Maze Bank Tower — à récupérer en jeu' },
  91: { tokens: 250000, description: '250 000 jetons' },
  92: { tokens: 260000, description: '260 000 jetons' },
  93: { tokens: 270000, description: '270 000 jetons' },
  94: { tokens: 280000, description: '280 000 jetons' },
  95: { tokens: 290000, description: '290 000 jetons' },
  96: { tokens: 300000, description: '300 000 jetons' },
  97: { tokens: 400000, description: '400 000 jetons' },
  98: { tokens: 500000, description: '500 000 jetons' },
  99: { tokens: 1500000, badge: '🌟 Diamant', vipDuration: '6_MONTHS', description: '1 500 000 jetons + Badge Diamant 🌟 + VIP 6 mois' },
  100: { tokens: 2000000, badge: '👑 Légendaire', vipDuration: 'LIFETIME', ingame: 'Supercar Truffade Adder + Manoir privé', description: '2 000 000 jetons + Badge Légendaire 👑 + VIP À vie + 🏆 Supercar Truffade Adder + Manoir privé — à récupérer en jeu' },
};

@Injectable()
export class LevelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
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
    if (reward.tokens) {
      await this.walletService.adminCredit(
        'SYSTEM',
        userId,
        reward.tokens,
        `🎉 Récompense niveau ${level}`,
      );
    }

    if (reward.vipDuration) {
      await this.vipService.adminGrantVip(
        'SYSTEM',
        userId,
        reward.vipDuration as any,
      );
    }

    // Enregistre la récompense
    await this.prisma.levelReward.create({
      data: {
        userId,
        level,
        rewardType: reward.ingame ? 'INGAME' : reward.badge ? 'BADGE' : reward.vipDuration ? 'VIP' : 'TOKENS',
        rewardValue: reward.description,
        isIngame: !!reward.ingame,
        ingameClaimed: false,
      },
    });
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