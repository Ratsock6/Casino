import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CasinoConfigService } from '../casino-config/casino-config.service';
import { CasinoGateway } from '../gateway/casino.gateway';
import {
  BOX_CATALOG, BOX_ITEMS, BOX_ITEMS as _,
  BoxType, calculateStake, drawItem,
} from './battle-box.catalog';
import { CreateBattleBoxGameDto } from './dto/create-game.dto';
import { JoinBattleBoxGameDto } from './dto/join-game.dto';
import { Prisma } from '../generated/prisma/client';

@Injectable()
export class BattleBoxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly casinoConfigService: CasinoConfigService,
    private readonly gateway: CasinoGateway,
  ) { }

  // ─── Catalogue ────────────────────────────────────────────────────────────
  getCatalog() {
    return Object.entries(BOX_CATALOG).map(([type, config]) => ({
      type,
      ...config,
      items: BOX_ITEMS[type as BoxType].map((item) => ({
        name: item.name,
        emoji: item.emoji,
        rarity: item.rarity,
        value: item.value,
      })),
    }));
  }

  // ─── Lobby ────────────────────────────────────────────────────────────────
  async getLobby() {
    const games = await this.prisma.battleBoxGame.findMany({
      where: { status: 'WAITING', isPrivate: false },
      orderBy: { createdAt: 'desc' },
      include: {
        players: {
          include: {
            user: { select: { username: true, role: true } },
          },
        },
      },
    });

    return games.map((g) => ({
      id: g.id,
      maxPlayers: g.maxPlayers,
      teamSize: g.teamSize,
      boxTypes: g.boxTypes,
      totalStake: Number(g.totalStake),
      playerCount: g.players.length,
      players: g.players.map((p) => ({
        username: p.user.username,
        role: p.user.role,
      })),
      createdAt: g.createdAt,
    }));
  }

  // ─── Créer une partie ─────────────────────────────────────────────────────
  async createGame(
    userId: string,
    userRole: string,
    dto: CreateBattleBoxGameDto,
  ) {
    // Vérifie si le jeu est activé
    const enabled = await this.casinoConfigService.getBoolean('BATTLEBOX_ENABLED', true);
    if (!enabled) throw new BadRequestException('Battle Box est actuellement indisponible.');

    // Vérifie la sélection de box
    this.validateBoxSelection(dto.boxSelection, userRole);

    // Calcule la mise
    const stake = calculateStake(dto.boxSelection);
    const maxStake = userRole === 'VIP' || userRole === 'ADMIN' || userRole === 'SUPER_ADMIN'
      ? parseInt(await this.casinoConfigService.get('BATTLEBOX_MAX_STAKE_VIP') || '100000')
      : parseInt(await this.casinoConfigService.get('BATTLEBOX_MAX_STAKE_PLAYER') || '50000');

    if (stake > maxStake) {
      throw new BadRequestException(`Mise totale trop élevée. Maximum : ${maxStake.toLocaleString()} jetons.`);
    }

    // Vérifie le solde
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet || wallet.balance < BigInt(stake)) {
      throw new BadRequestException('Solde insuffisant.');
    }

    // Récupère la commission
    const commissionPct = userRole === 'VIP'
      ? parseFloat(await this.casinoConfigService.get('BATTLEBOX_VIP_COMMISSION_PCT') || '2')
      : parseFloat(await this.casinoConfigService.get('BATTLEBOX_COMMISSION_PCT') || '5');

    // Génère le code d'invitation si partie privée
    const inviteCode = dto.isPrivate
      ? Math.random().toString(36).substring(2, 8).toUpperCase()
      : null;

    return this.prisma.$transaction(async (tx) => {
      // Débite le joueur
      await tx.wallet.update({
        where: { userId },
        data: { balance: { decrement: BigInt(stake) } },
      });

      await tx.walletTransaction.create({
        data: {
          userId,
          type: 'BET',
          amount: BigInt(stake),
          balanceBefore: wallet.balance,
          balanceAfter: wallet.balance - BigInt(stake),
          gameType: 'BATTLE_BOX',
          reason: 'Battle Box — mise initiale',
        },
      });

      // Crée la partie
      const game = await tx.battleBoxGame.create({
        data: {
          maxPlayers: dto.maxPlayers || 2,
          teamSize: dto.teamSize || 1,
          isPrivate: dto.isPrivate || false,
          inviteCode,
          boxTypes: dto.boxSelection as any,
          totalStake: BigInt(stake),
          commissionPct,
          players: {
            create: {
              userId,
              teamIndex: 0,
              stake: BigInt(stake),
            },
          },
        },
        include: {
          players: {
            include: { user: { select: { username: true } } },
          },
        },
      });

      return {
        gameId: game.id,
        inviteCode: game.inviteCode,
        stake,
        boxSelection: dto.boxSelection,
        message: dto.isPrivate
          ? `Partie privée créée ! Code : ${inviteCode}`
          : 'Partie créée ! En attente d\'un adversaire...',
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  // ─── Rejoindre une partie ─────────────────────────────────────────────────
  async joinGame(userId: string, userRole: string, dto: JoinBattleBoxGameDto) {
    const enabled = await this.casinoConfigService.getBoolean('BATTLEBOX_ENABLED', true);
    if (!enabled) throw new BadRequestException('Battle Box est actuellement indisponible.');

    const game = await this.prisma.battleBoxGame.findUnique({
      where: { id: dto.gameId },
      include: { players: true },
    });

    if (!game) throw new NotFoundException('Partie introuvable.');
    if (game.status !== 'WAITING') throw new BadRequestException('Cette partie n\'est plus disponible.');
    if (game.players.some((p) => p.userId === userId)) throw new BadRequestException('Vous êtes déjà dans cette partie.');
    if (game.isPrivate && game.inviteCode !== dto.inviteCode) throw new BadRequestException('Code d\'invitation invalide.');
    if (game.players.length >= game.maxPlayers) throw new BadRequestException('Cette partie est complète.');

    const stake = Number(game.totalStake) / game.players.length;

    // Vérifie le solde
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet || wallet.balance < BigInt(stake)) {
      throw new BadRequestException('Solde insuffisant.');
    }

    const teamIndex = game.players.length;
    const isLastPlayer = game.players.length + 1 === game.maxPlayers;

    return this.prisma.$transaction(async (tx) => {
      // Débite le joueur
      await tx.wallet.update({
        where: { userId },
        data: { balance: { decrement: BigInt(stake) } },
      });

      await tx.walletTransaction.create({
        data: {
          userId,
          type: 'BET',
          amount: BigInt(stake),
          balanceBefore: wallet.balance,
          balanceAfter: wallet.balance - BigInt(stake),
          reason: 'Battle Box — mise',
        },
      });

      // Ajoute le joueur
      await tx.battleBoxPlayer.create({
        data: {
          gameId: game.id,
          userId,
          teamIndex,
          stake: BigInt(stake),
        },
      });

      // Si la partie est complète → démarre
      if (isLastPlayer) {
        await tx.battleBoxGame.update({
          where: { id: game.id },
          data: { status: 'PLAYING', startedAt: new Date() },
        });

        // Notifie tous les joueurs
        this.gateway.broadcast(`battlebox:game_start_${game.id}`, { gameId: game.id });

        // Lance la résolution en async
        setTimeout(() => this.resolveGame(game.id), 3000);
      }

      return {
        gameId: game.id,
        stake,
        message: isLastPlayer ? 'Partie démarrée !' : 'Vous avez rejoint la partie !',
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  // ─── Résolution de la partie ──────────────────────────────────────────────
  async resolveGame(gameId: string) {
    const game = await this.prisma.battleBoxGame.findUnique({
      where: { id: gameId },
      include: { players: { include: { user: { select: { username: true } } } } },
    });

    if (!game || game.status !== 'PLAYING') return;

    const boxSelection = game.boxTypes as Record<string, number>;

    // Tire les objets pour chaque joueur
    const playerResults = game.players.map((player) => {
      const items: Array<{ name: string; value: number; rarity: string; emoji: string }> = [];

      for (const [boxType, count] of Object.entries(boxSelection)) {
        for (let i = 0; i < count; i++) {
          const item = drawItem(boxType as BoxType);
          items.push({ name: item.name, value: item.value, rarity: item.rarity, emoji: item.emoji });
        }
      }

      const totalValue = items.reduce((sum, item) => sum + item.value, 0);
      return { player, items, totalValue };
    });

    // Détermine le gagnant
    const maxValue = Math.max(...playerResults.map((r) => r.totalValue));
    const winners = playerResults.filter((r) => r.totalValue === maxValue);

    // En cas d'égalité → tirage aléatoire
    const winner = winners[Math.floor(Math.random() * winners.length)];

    // Calcule le pot
    const totalMises = game.players.reduce((sum, p) => sum + Number(p.stake), 0);
    const commission = Math.floor(totalMises * game.commissionPct / 100);
    const totalObjectsValue = playerResults.reduce((sum, r) => sum + r.totalValue, 0);

    const payout = totalObjectsValue;

    // Met à jour les joueurs
    await this.prisma.$transaction(async (tx) => {
      for (const result of playerResults) {
        const isWinner = result.player.id === winner.player.id;

        await tx.battleBoxPlayer.update({
          where: { id: result.player.id },
          data: {
            items: result.items as any,
            totalValue: BigInt(result.totalValue),
            isWinner,
          },
        });

        if (isWinner) {
          const wallet = await tx.wallet.findUnique({ where: { userId: result.player.userId } });
          if (wallet) {
            await tx.wallet.update({
              where: { userId: result.player.userId },
              data: { balance: { increment: BigInt(payout) } },
            });

            await tx.walletTransaction.create({
              data: {
                userId: result.player.userId,
                type: 'WIN',
                amount: BigInt(payout),
                balanceBefore: wallet.balance,
                balanceAfter: wallet.balance + BigInt(payout),
                reason: `Battle Box — victoire (${payout.toLocaleString()} jetons d'objets)`,
              },
            });
          }
        }

        await tx.walletTransaction.create({
          data: {
            userId: winner.player.userId,
            type: 'BET',
            amount: BigInt(commission),
            balanceBefore: BigInt(0),
            balanceAfter: BigInt(0),
            reason: `Battle Box — commission casino (${game.commissionPct}%)`,
          },
        }).catch(() => { });
      }

      // Finalise la partie
      await tx.battleBoxGame.update({
        where: { id: gameId },
        data: {
          status: 'FINISHED',
          winnerId: winner.player.userId,
          settledAt: new Date(),
        },
      });
    });

    // Notifie les joueurs du résultat
    const resultPayload = {
      gameId,
      players: playerResults.map((r) => ({
        username: r.player.user.username,
        userId: r.player.userId,
        items: r.items,
        totalValue: r.totalValue,
        isWinner: r.player.userId === winner.player.userId,
      })),
      winner: {
        username: winner.player.user.username,
        userId: winner.player.userId,
        payout,
        commission,
        totalMises,
      },
      commission,
      totalObjectsValue,
    };

    this.gateway.broadcast(`battlebox:result_${gameId}`, resultPayload);

    // XP pour tous les joueurs
    for (const result of playerResults) {
      const stake = Number(result.player.stake);
      await this.prisma.playerLevel.upsert({
        where: { userId: result.player.userId },
        update: {
          currentXp: { increment: Math.floor(stake / 100) + 50 },
          totalXp: { increment: Math.floor(stake / 100) + 50 },
        },
        create: {
          userId: result.player.userId,
          level: 0,
          currentXp: BigInt(Math.floor(stake / 100) + 50),
          totalXp: BigInt(Math.floor(stake / 100) + 50),
        },
      }).catch(console.error);
    }
  }

  // ─── Annuler une partie ───────────────────────────────────────────────────
  async cancelGame(userId: string, gameId: string) {
    const game = await this.prisma.battleBoxGame.findUnique({
      where: { id: gameId },
      include: { players: true },
    });

    if (!game) throw new NotFoundException('Partie introuvable.');
    if (game.status !== 'WAITING') throw new BadRequestException('Impossible d\'annuler une partie en cours.');

    const creator = game.players[0];
    if (creator.userId !== userId) throw new BadRequestException('Seul le créateur peut annuler la partie.');

    return this.prisma.$transaction(async (tx) => {
      // Rembourse tous les joueurs
      for (const player of game.players) {
        const wallet = await tx.wallet.findUnique({ where: { userId: player.userId } });
        if (wallet) {
          await tx.wallet.update({
            where: { userId: player.userId },
            data: { balance: { increment: player.stake } },
          });
          await tx.walletTransaction.create({
            data: {
              userId: player.userId,
              type: 'REFUND',
              amount: player.stake,
              balanceBefore: wallet.balance,
              balanceAfter: wallet.balance + player.stake,
              reason: 'Battle Box — annulation',
            },
          });
        }
      }

      await tx.battleBoxGame.update({
        where: { id: gameId },
        data: { status: 'CANCELLED' },
      });

      return { message: 'Partie annulée et remboursée.' };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  // ─── Récupère une partie ──────────────────────────────────────────────────
  async getGame(gameId: string) {
    const game = await this.prisma.battleBoxGame.findUnique({
      where: { id: gameId },
      include: {
        players: {
          include: {
            user: { select: { username: true, role: true } },
          },
        },
      },
    });

    if (!game) throw new NotFoundException('Partie introuvable.');

    return {
      ...game,
      totalStake: Number(game.totalStake),
      players: game.players.map((p) => ({
        ...p,
        stake: Number(p.stake),
        totalValue: p.totalValue ? Number(p.totalValue) : null,
      })),
    };
  }

  // ─── Mes parties ──────────────────────────────────────────────────────────
  async getMyGames(userId: string) {
    const players = await this.prisma.battleBoxPlayer.findMany({
      where: { userId },
      orderBy: { joinedAt: 'desc' },
      take: 20,
      include: {
        game: {
          include: {
            players: {
              include: { user: { select: { username: true } } },
            },
          },
        },
      },
    });

    return players.map((p) => ({
      gameId: p.gameId,
      status: p.game.status,
      stake: Number(p.stake),
      isWinner: p.isWinner,
      items: p.items,
      totalValue: Number(p.totalValue || 0),
      players: p.game.players.map((pl) => pl.user.username),
      settledAt: p.game.settledAt,
    }));
  }

  // ─── Validation ───────────────────────────────────────────────────────────
  private validateBoxSelection(boxSelection: Record<string, number>, userRole: string) {
    if (!boxSelection || Object.keys(boxSelection).length === 0) {
      throw new BadRequestException('Sélectionnez au moins une box.');
    }

    for (const [boxType, count] of Object.entries(boxSelection)) {
      const box = BOX_CATALOG[boxType as BoxType];
      if (!box) throw new BadRequestException(`Type de box invalide : ${boxType}`);
      if (box.vipOnly && !['VIP', 'ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
        throw new BadRequestException(`La box ${box.label} est réservée aux membres VIP.`);
      }
      if (count < 1) throw new BadRequestException('Le nombre de box doit être au moins 1.');
    }
  }

  async getGameByCode(code: string) {
    const game = await this.prisma.battleBoxGame.findUnique({
      where: { inviteCode: code },
    });

    if (!game) throw new NotFoundException('Code invalide ou partie introuvable.');
    if (game.status !== 'WAITING') throw new BadRequestException('Cette partie n\'est plus disponible.');

    return { id: game.id };
  }

  async getActiveGame(userId: string) {
    const player = await this.prisma.battleBoxPlayer.findFirst({
      where: {
        userId,
        game: {
          status: { in: ['WAITING', 'PLAYING'] },
        },
      },
      orderBy: { joinedAt: 'desc' },
      include: {
        game: {
          include: {
            players: {
              include: {
                user: { select: { username: true, role: true } },
              },
            },
          },
        },
      },
    });

    if (!player) return null;

    return {
      ...player.game,
      totalStake: Number(player.game.totalStake),
      players: player.game.players.map((p) => ({
        ...p,
        stake: Number(p.stake),
        totalValue: p.totalValue ? Number(p.totalValue) : null,
      })),
    };
  }

  async getAllGames(limit = 50, offset = 0, userId?: string) {
    const games = await this.prisma.battleBoxGame.findMany({
      take: limit,
      skip: offset,
      where: userId ? {
        players: { some: { userId } },
      } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        players: {
          include: {
            user: { select: { id: true, username: true, role: true } },
          },
        },
      },
    });

    return games.map((g) => ({
      id: g.id,
      status: g.status,
      maxPlayers: g.maxPlayers,
      boxTypes: g.boxTypes,
      totalStake: Number(g.totalStake),
      commissionPct: g.commissionPct,
      winnerId: g.winnerId,
      createdAt: g.createdAt,
      settledAt: g.settledAt,
      players: g.players.map((p) => ({
        username: p.user.username,
        role: p.user.role,
        userId: p.userId,
        stake: Number(p.stake),
        totalValue: p.totalValue ? Number(p.totalValue) : null,
        isWinner: p.isWinner,
        items: p.items,
      })),
    }));
  }
}