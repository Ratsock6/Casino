import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
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
import { LevelsService } from '../levels/levels.service';

@Injectable()
export class BattleBoxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly casinoConfigService: CasinoConfigService,
    private readonly gateway: CasinoGateway,
    private readonly levelsService: LevelsService,
  ) { }

  // ─── Catalogue ────────────────────────────────────────────────────────────
  getCatalog() {
    return Object.entries(BOX_CATALOG).map(([type, config]) => {
      const items = BOX_ITEMS[type as BoxType];
      const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
      // Valeur moyenne pondérée (sert à la jauge de sécurité côté front)
      const avgValue = items.reduce((sum, i) => sum + i.value * i.weight, 0) / totalWeight;

      return {
        type,
        ...config,
        avgValue: Math.round(avgValue),
        items: items.map((item) => ({
          name: item.name,
          emoji: item.emoji,
          rarity: item.rarity,
          value: item.value,
          // Probabilité de tomber sur cet item (en %)
          chance: Math.round((item.weight / totalWeight) * 1000) / 10,
        })),
      };
    });
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
        username: p.user?.username ?? p.botName ?? 'Bot Casino',
        role: p.user?.role ?? 'BOT',
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

  // ─── Remplir les places vides avec des bots (VIP uniquement) ──────────────
  async addBots(userId: string, userRole: string, gameId: string) {
    // Réservé aux VIP / admins
    if (!['VIP', 'ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
      throw new BadRequestException('Seuls les membres VIP peuvent ajouter des bots.');
    }

    const game = await this.prisma.battleBoxGame.findUnique({
      where: { id: gameId },
      include: { players: true },
    });

    if (!game) throw new NotFoundException('Partie introuvable.');
    if (game.status !== 'WAITING') throw new BadRequestException('Cette partie n\'est plus en attente.');

    // Seul l'hôte (le premier joueur) peut ajouter des bots
    const host = game.players.find((p) => p.teamIndex === 0);
    if (!host || host.userId !== userId) {
      throw new BadRequestException('Seul l\'hôte de la partie peut ajouter des bots.');
    }

    const emptySlots = game.maxPlayers - game.players.length;
    if (emptySlots <= 0) throw new BadRequestException('La partie est déjà complète.');

    // Le bot mise la même chose que l'hôte (mêmes box → même mise)
    const stakePerPlayer = Number(game.totalStake) / Math.max(game.players.length, 1);

    await this.prisma.$transaction(async (tx) => {
      // Crée un bot par place vide
      for (let i = 0; i < emptySlots; i++) {
        await tx.battleBoxPlayer.create({
          data: {
            gameId: game.id,
            userId: null,
            isBot: true,
            botName: emptySlots > 1 ? `Bot Casino #${i + 1}` : 'Bot Casino',
            teamIndex: game.players.length + i,
            stake: BigInt(Math.floor(stakePerPlayer)),
          },
        });
      }

      // Marque la partie comme contenant des bots et la démarre
      await tx.battleBoxGame.update({
        where: { id: game.id },
        data: { status: 'PLAYING', startedAt: new Date(), hasBots: true },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    // Notifie + lance la résolution
    this.gateway.broadcast(`battlebox:game_start_${game.id}`, { gameId: game.id });
    setTimeout(() => this.resolveGame(game.id), 3000);

    return { gameId: game.id, botsAdded: emptySlots, message: `${emptySlots} bot(s) ajouté(s) — partie lancée !` };
  }

  // ─── Annoncer sa partie à tous les joueurs (pop-up) ───────────────────────
  async announceGame(userId: string, gameId: string) {
    const game = await this.prisma.battleBoxGame.findUnique({
      where: { id: gameId },
      include: { players: { include: { user: { select: { username: true } } } } },
    });

    if (!game) throw new NotFoundException('Partie introuvable.');
    if (game.status !== 'WAITING') throw new BadRequestException('Cette partie n\'est plus en attente.');
    if (game.isPrivate) throw new BadRequestException('Une partie privée ne peut pas être annoncée.');

    // Seul l'hôte peut annoncer
    const host = game.players.find((p) => p.teamIndex === 0);
    if (!host || host.userId !== userId) {
      throw new BadRequestException('Seul l\'hôte peut annoncer la partie.');
    }

    const hostName = host.user?.username ?? 'Un joueur';
    const stakePerPlayer = Number(game.totalStake) / Math.max(game.players.length, 1);

    // Diffuse l'annonce à TOUS les joueurs connectés (pop-up)
    this.gateway.broadcast('battlebox:announcement', {
      gameId: game.id,
      host: hostName,
      stakePerPlayer: Math.floor(stakePerPlayer),
      boxTypes: game.boxTypes,
      maxPlayers: game.maxPlayers,
      playerCount: game.players.length,
      slotsLeft: game.maxPlayers - game.players.length,
    });

    return { message: 'Annonce diffusée à tous les joueurs !' };
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

    // Détermine le(s) gagnant(s) : plus grande valeur d'objets.
    const maxValue = Math.max(...playerResults.map((r) => r.totalValue));
    const tiedWinners = playerResults.filter((r) => r.totalValue === maxValue);

    // En cas d'égalité parfaite → tirage au sort entre les ex-æquo.
    const isTie = tiedWinners.length > 1;
    const winner = tiedWinners[Math.floor(Math.random() * tiedWinners.length)];

    // ── Économie ──
    // Le gagnant remporte la valeur totale des objets (les siens + ceux de l'adversaire).
    // Le casino prélève sa commission sur ce gain. La commission n'est jamais versée
    // (elle reste dans la réserve), donc c'est un revenu net pour le casino.
    const totalObjectsValue = playerResults.reduce((sum, r) => sum + r.totalValue, 0);
    const commission = Math.floor((totalObjectsValue * game.commissionPct) / 100);
    const payout = totalObjectsValue - commission; // ce que touche réellement le gagnant
    const totalMises = game.players.reduce((sum, p) => sum + Number(p.stake), 0);

    // Le gagnant est-il un bot ? (un bot n'a pas de userId)
    const winnerIsBot = winner.player.isBot;

    // ── Calcul du bénéfice casino réalisé grâce aux bots ──
    // Pertinent uniquement si la partie contient des bots.
    // Trésorerie réelle du casino sur cette partie (les bots = argent du casino) :
    //   + il encaisse les mises des VRAIS joueurs
    //   - il verse le payout au gagnant SEULEMENT si c'est un vrai joueur
    //   (si le bot gagne, rien n'est versé à l'extérieur)
    let botProfit = 0;
    if (game.hasBots) {
      const realPlayersStake = game.players
        .filter((p) => !p.isBot)
        .reduce((sum, p) => sum + Number(p.stake), 0);
      botProfit = winnerIsBot ? realPlayersStake : realPlayersStake - payout;
    }

    // Transaction atomique + anti-rejeu : on verrouille le passage en FINISHED.
    const settled = await this.prisma.$transaction(
      async (tx) => {
        // Garde anti-rejeu : ne passe FINISHED que si la partie est encore PLAYING.
        // Si une autre exécution a déjà résolu la partie, count = 0 → on abandonne.
        const lock = await tx.battleBoxGame.updateMany({
          where: { id: gameId, status: 'PLAYING' },
          data: {
            status: 'FINISHED',
            winnerId: winner.player.userId,
            settledAt: new Date(),
            botProfit: BigInt(botProfit),
          },
        });
        if (lock.count === 0) {
          return false; // déjà résolue par un autre appel
        }

        // Enregistre les résultats de chaque joueur
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
        }

        // Crédite le gagnant (valeur des objets − commission)
        // UNIQUEMENT si c'est un vrai joueur : un bot ne reçoit pas de jetons.
        const winnerUserId = winner.player.userId;
        if (!winnerIsBot && winnerUserId) {
          const winnerWallet = await tx.wallet.findUnique({
            where: { userId: winnerUserId },
          });
          if (winnerWallet) {
            const before = winnerWallet.balance;
            const after = before + BigInt(payout);
            await tx.wallet.update({
              where: { userId: winnerUserId },
              data: { balance: after },
            });
            await tx.walletTransaction.create({
              data: {
                userId: winnerUserId,
                type: 'WIN',
                amount: BigInt(payout),
                balanceBefore: before,
                balanceAfter: after,
                gameType: 'BATTLE_BOX',
                reason: `Battle Box — victoire (${payout.toLocaleString()} jetons, commission ${game.commissionPct}% = ${commission.toLocaleString()})`,
              },
            });
          }
        }

        return true;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    // Si la partie était déjà résolue, on s'arrête là (pas de double notif/XP).
    if (!settled) return;

    // Notifie les joueurs du résultat
    const resultPayload = {
      gameId,
      isTie,
      players: playerResults.map((r) => ({
        username: r.player.user?.username ?? r.player.botName ?? 'Bot Casino',
        userId: r.player.userId,
        isBot: r.player.isBot,
        items: r.items,
        totalValue: r.totalValue,
        isWinner: r.player.id === winner.player.id,
      })),
      winner: {
        username: winner.player.user?.username ?? winner.player.botName ?? 'Bot Casino',
        userId: winner.player.userId,
        isBot: winner.player.isBot,
        payout,
        commission,
        totalMises,
      },
      commission,
      totalObjectsValue,
    };

    this.gateway.broadcast(`battlebox:result_${gameId}`, resultPayload);

    // XP pour tous les VRAIS joueurs — via le service centralisé (applique le seuil XP_MIN_STAKE).
    // Les bots ne reçoivent pas d'XP.
    for (const result of playerResults) {
      if (result.player.isBot || !result.player.userId) continue;
      const xpUserId = result.player.userId;
      await this.levelsService
        .addXp(xpUserId, Number(result.player.stake))
        .catch(console.error);
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
      // Rembourse tous les VRAIS joueurs (les bots n'ont pas de wallet).
      for (const player of game.players) {
        if (player.isBot || !player.userId) continue;
        const playerUserId = player.userId;
        const wallet = await tx.wallet.findUnique({ where: { userId: playerUserId } });
        if (wallet) {
          await tx.wallet.update({
            where: { userId: playerUserId },
            data: { balance: { increment: player.stake } },
          });
          await tx.walletTransaction.create({
            data: {
              userId: playerUserId,
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
      botProfit: Number(game.botProfit),
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
      players: p.game.players.map((pl) => pl.user?.username ?? pl.botName ?? 'Bot Casino'),
      settledAt: p.game.settledAt,
    }));
  }

  // ─── Statistiques personnelles du joueur ──────────────────────────────────
  async getMyStats(userId: string) {
    // On ne compte que les parties terminées pour des stats fiables.
    const players = await this.prisma.battleBoxPlayer.findMany({
      where: { userId, game: { status: 'FINISHED' } },
      include: { game: { select: { totalStake: true, commissionPct: true } } },
    });

    const gamesPlayed = players.length;
    const wins = players.filter((p) => p.isWinner).length;
    const losses = gamesPlayed - wins;
    const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 1000) / 10 : 0;

    let totalStaked = 0;
    let totalWon = 0; // ce que le joueur a réellement encaissé en victoires
    let biggestWin = 0;

    for (const p of players) {
      totalStaked += Number(p.stake);
      if (p.isWinner) {
        // Gain net = valeur totale du pot (totalStake) − commission
        const pot = Number(p.game.totalStake);
        const payout = Math.floor(pot - (pot * p.game.commissionPct) / 100);
        totalWon += payout;
        if (payout > biggestWin) biggestWin = payout;
      }
    }

    const netProfit = totalWon - totalStaked;

    return {
      gamesPlayed,
      wins,
      losses,
      winRate,
      totalStaked,
      totalWon,
      biggestWin,
      netProfit, // peut être négatif
    };
  }

  // ─── Classement des joueurs (leaderboard) ─────────────────────────────────
  // Top joueurs par nombre de victoires sur les parties terminées.
  async getLeaderboard(limit = 20) {
    const players = await this.prisma.battleBoxPlayer.findMany({
      where: { game: { status: 'FINISHED' }, isBot: false, userId: { not: null } },
      include: {
        game: { select: { totalStake: true, commissionPct: true } },
        user: { select: { id: true, username: true, role: true } },
      },
    });

    // Agrège par joueur
    const byUser = new Map<string, {
      userId: string; username: string; role: string;
      wins: number; games: number; totalWon: number; biggestWin: number;
    }>();

    for (const p of players) {
      if (!p.user) continue; // sécurité : ignore les bots
      const key = p.user.id;
      const entry = byUser.get(key) ?? {
        userId: key, username: p.user.username, role: p.user.role,
        wins: 0, games: 0, totalWon: 0, biggestWin: 0,
      };
      entry.games += 1;
      if (p.isWinner) {
        entry.wins += 1;
        const pot = Number(p.game.totalStake);
        const payout = Math.floor(pot - (pot * p.game.commissionPct) / 100);
        entry.totalWon += payout;
        if (payout > entry.biggestWin) entry.biggestWin = payout;
      }
      byUser.set(key, entry);
    }

    return Array.from(byUser.values())
      .map((e) => ({
        ...e,
        winRate: e.games > 0 ? Math.round((e.wins / e.games) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.wins - a.wins || b.totalWon - a.totalWon)
      .slice(0, limit);
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
      botProfit: Number(player.game.botProfit),
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
      totalPot: g.players.reduce((sum, p) => sum + Number(p.stake), 0), // 👈 nouveau — total de tous les joueurs
      commission: Math.floor(
        g.players.reduce((sum, p) => sum + Number(p.stake), 0) * g.commissionPct / 100
      ),
      casinoNet: Math.floor(
        g.players.reduce((sum, p) => sum + Number(p.stake), 0) -
        g.players.reduce((sum, p) => sum + Number(p.totalValue || 0), 0)
      ),
      commissionPct: g.commissionPct,
      winnerId: g.winnerId,
      createdAt: g.createdAt,
      settledAt: g.settledAt,
      players: g.players.map((p) => ({
        username: p.user?.username ?? p.botName ?? 'Bot Casino',
        role: p.user?.role ?? 'BOT',
        userId: p.userId,
        stake: Number(p.stake),
        totalValue: p.totalValue ? Number(p.totalValue) : null,
        isWinner: p.isWinner,
        items: p.items,
      })),
    }));
  }

  // ─── Réconciliation : résout les parties bloquées en PLAYING ────────────────
  // Filet de sécurité si le backend a redémarré pendant le délai de résolution
  // (le setTimeout est perdu à un redémarrage). Toutes les minutes, on relance
  // la résolution des parties PLAYING démarrées il y a plus de 30 secondes.
  @Cron('*/1 * * * *')
  async reconcileStuckGames() {
    const cutoff = new Date(Date.now() - 30 * 1000);
    const stuck = await this.prisma.battleBoxGame.findMany({
      where: { status: 'PLAYING', startedAt: { lt: cutoff } },
      select: { id: true },
    });
    for (const g of stuck) {
      await this.resolveGame(g.id).catch(console.error);
    }
  }
}
