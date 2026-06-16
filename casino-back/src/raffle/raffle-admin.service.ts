import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { randomBytes, createHash } from 'crypto';
import {
  Prisma,
  RaffleDrawStatus,
  RaffleTicketStatus,
  RaffleClaimStatus,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CasinoGateway } from '../gateway/casino.gateway';
import { CreateCampaignDto } from './dto/create-campaign.dto';

// Délai (en heures) dont dispose un gagnant pour ouvrir sa réclamation Discord.
const CLAIM_WINDOW_HOURS = 72; // 3 jours

@Injectable()
export class RaffleAdminService {
  private readonly logger = new Logger(RaffleAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: CasinoGateway,
  ) {}

  // ───────────────────────────────────────────────────────────────────────────
  // Tirage d'un tirage donné — atomique + anti-rejeu + graine d'audit
  // ───────────────────────────────────────────────────────────────────────────
  async executeDraw(drawId: string) {
    // Toute la sélection se fait dans UNE transaction Serializable :
    // - on (re)vérifie que le tirage est PENDING (anti double-exécution),
    // - on pioche les gagnants parmi les tickets ACTIVE,
    // - on marque tickets + tirage dans la même transaction.
    const result = await this.prisma.$transaction(
      async (tx) => {
        const draw = await tx.raffleDraw.findUnique({
          where: { id: drawId },
          include: {
            prizes: { orderBy: { rank: 'asc' } },
            campaign: true,
          },
        });

        if (!draw) throw new NotFoundException('Tirage introuvable.');
        if (draw.status === RaffleDrawStatus.DONE) {
          throw new BadRequestException('Ce tirage a déjà été effectué.');
        }
        if (draw.prizes.length === 0) {
          throw new BadRequestException('Aucun lot défini pour ce tirage.');
        }

        // Graine d'audit : on tire une graine aléatoire, on en stocke le hash + la graine.
        // Le tirage reste un simple random serveur, mais la graine permet de prouver
        // a posteriori qu'on n'a pas "choisi" les gagnants après coup.
        const seed = randomBytes(16).toString('hex');
        const seedHash = createHash('sha256').update(seed).digest('hex');

        // Pool de tickets éligibles : uniquement ACTIVE sur cette campagne.
        const activeTickets = await tx.raffleTicket.findMany({
          where: { campaignId: draw.campaignId, status: RaffleTicketStatus.ACTIVE },
          select: { id: true, userId: true, ticketNumber: true },
        });

        // Mélange déterministe à partir de la graine (Fisher-Yates seedé).
        const pool = this.shuffleWithSeed(activeTickets, seed);

        const now = new Date();
        const claimDeadline = new Date(now.getTime() + CLAIM_WINDOW_HOURS * 3600 * 1000);

        const winners: Array<{
          ticketId: string;
          ticketNumber: number;
          userId: string;
          prizeId: string;
          prizeLabel: string;
          prizeType: string;
        }> = [];

        let poolIndex = 0;

        // Pour chaque lot, on tire `quantity` gagnants en piochant en tête de pool.
        // Si le pool est épuisé (moins de tickets actifs que de lots) -> on distribue
        // seulement ce qu'on peut, les lots restants ne sont pas attribués.
        for (const prize of draw.prizes) {
          for (let i = 0; i < prize.quantity; i++) {
            if (poolIndex >= pool.length) break; // plus de tickets disponibles
            const ticket = pool[poolIndex++];
            winners.push({
              ticketId: ticket.id,
              ticketNumber: ticket.ticketNumber,
              userId: ticket.userId,
              prizeId: prize.id,
              prizeLabel: prize.label,
              prizeType: prize.type,
            });
          }
        }

        // Applique les résultats : chaque ticket gagnant -> WON + lot + deadline.
        for (const w of winners) {
          await tx.raffleTicket.update({
            where: { id: w.ticketId },
            data: {
              status: RaffleTicketStatus.WON,
              wonDrawId: draw.id,
              wonPrizeId: w.prizeId,
              claimStatus: RaffleClaimStatus.UNCLAIMED,
              claimDeadline,
            },
          });
        }

        // Marque le tirage comme effectué (dans la même transaction = anti-rejeu).
        await tx.raffleDraw.update({
          where: { id: draw.id },
          data: {
            status: RaffleDrawStatus.DONE,
            executedAt: now,
            seed: `${seed}:${seedHash}`, // graine + hash conservés pour l'audit
          },
        });

        const totalPrizeSlots = draw.prizes.reduce((s, p) => s + p.quantity, 0);

        return {
          drawId: draw.id,
          drawLabel: draw.label,
          campaignName: draw.campaign.name,
          seedHash,
          eligibleTickets: activeTickets.length,
          totalPrizeSlots,
          awarded: winners.length,
          unawarded: Math.max(0, totalPrizeSlots - winners.length),
          claimDeadline,
          winners: winners.map((w) => ({
            ticketNumber: w.ticketNumber,
            userId: w.userId,
            prizeLabel: w.prizeLabel,
            prizeType: w.prizeType,
          })),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    // Notifications temps réel aux gagnants (hors transaction).
    for (const w of result.winners) {
      this.gateway.notifyUser(w.userId, 'raffle:won', {
        prizeLabel: w.prizeLabel,
        prizeType: w.prizeType,
        ticketNumber: w.ticketNumber,
        claimDeadline: result.claimDeadline,
        message: `🎉 Vous avez gagné « ${w.prizeLabel} » à la tombola ! Ouvrez un ticket Discord sous 3 jours pour le réclamer.`,
      });
    }

    this.logger.log(
      `Tirage ${result.drawId} effectué : ${result.awarded}/${result.totalPrizeSlots} lots attribués (${result.eligibleTickets} tickets éligibles).`,
    );

    return result;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Liste des gagnants (pour le panel admin) — toutes campagnes ou une campagne
  // ───────────────────────────────────────────────────────────────────────────
  async getWinners(campaignId?: string) {
    const winners = await this.prisma.raffleTicket.findMany({
      where: {
        status: RaffleTicketStatus.WON,
        ...(campaignId ? { campaignId } : {}),
      },
      orderBy: [{ campaignId: 'asc' }, { wonDrawId: 'asc' }, { ticketNumber: 'asc' }],
      include: {
        user: { select: { id: true, username: true, discordId: true, discordUsername: true } },
        wonPrize: true,
        wonDraw: { select: { id: true, label: true, scheduledAt: true, executedAt: true } },
        campaign: { select: { id: true, name: true } },
      },
    });

    return winners.map((t) => ({
      ticketId: t.id,
      ticketNumber: t.ticketNumber,
      campaign: t.campaign,
      draw: t.wonDraw,
      prize: t.wonPrize
        ? { type: t.wonPrize.type, label: t.wonPrize.label, value: t.wonPrize.value }
        : null,
      winner: {
        userId: t.user.id,
        username: t.user.username,
        discordId: t.user.discordId,
        discordUsername: t.user.discordUsername,
      },
      claimStatus: t.claimStatus,
      claimDeadline: t.claimDeadline,
      claimedAt: t.claimedAt,
    }));
  }

  /// Marque un lot comme réclamé/remis (action staff depuis le panel admin
  /// ou lors du traitement du ticket Discord de réclamation).
  async markClaimed(ticketId: string) {
    const ticket = await this.prisma.raffleTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket introuvable.');
    if (ticket.status !== RaffleTicketStatus.WON) {
      throw new BadRequestException("Ce ticket n'est pas un ticket gagnant.");
    }
    if (ticket.claimStatus === RaffleClaimStatus.EXPIRED) {
      throw new BadRequestException('Le délai de réclamation de ce lot est dépassé.');
    }

    return this.prisma.raffleTicket.update({
      where: { id: ticketId },
      data: { claimStatus: RaffleClaimStatus.CLAIMED, claimedAt: new Date() },
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Gestion des campagnes (création, ouverture/fermeture, liste)
  // ───────────────────────────────────────────────────────────────────────────

  /// Crée une campagne complète avec ses tirages et leurs lots (en une transaction).
  async createCampaign(adminId: string, dto: CreateCampaignDto) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (endsAt <= startsAt) {
      throw new BadRequestException('La date de fin doit être après la date de début.');
    }
    for (const d of dto.draws) {
      const when = new Date(d.scheduledAt);
      if (when < startsAt || when > endsAt) {
        throw new BadRequestException(
          `Le tirage "${d.label ?? when.toISOString()}" doit être compris dans la période de la campagne.`,
        );
      }
    }

    const campaign = await this.prisma.$transaction(async (tx) => {
      const created = await tx.raffleCampaign.create({
        data: {
          name: dto.name,
          description: dto.description,
          ticketPrice: BigInt(dto.ticketPrice),
          maxTicketsPerUser: dto.maxTicketsPerUser,
          startsAt,
          endsAt,
          createdBy: adminId,
          // status par défaut = DRAFT
          draws: {
            create: dto.draws.map((d) => ({
              label: d.label,
              scheduledAt: new Date(d.scheduledAt),
              prizes: {
                create: d.prizes.map((p) => ({
                  type: p.type,
                  label: p.label,
                  value: p.value ?? null,
                  rank: p.rank ?? 1,
                  quantity: p.quantity,
                })),
              },
            })),
          },
        },
        include: { draws: { include: { prizes: true } } },
      });
      return created;
    });

    return this.serializeCampaign(campaign);
  }

  /// Ouvre une campagne (DRAFT -> OPEN). Ferme toute autre campagne OPEN au passage.
  async openCampaign(campaignId: string) {
    const campaign = await this.prisma.raffleCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campagne introuvable.');
    if (campaign.status === 'ENDED') {
      throw new BadRequestException('Cette campagne est déjà terminée.');
    }

    // Une seule campagne OPEN à la fois : on bascule les autres OPEN en ENDED.
    await this.prisma.$transaction([
      this.prisma.raffleCampaign.updateMany({
        where: { status: 'OPEN', id: { not: campaignId } },
        data: { status: 'ENDED' },
      }),
      this.prisma.raffleCampaign.update({
        where: { id: campaignId },
        data: { status: 'OPEN' },
      }),
    ]);

    return { id: campaignId, status: 'OPEN' };
  }

  /// Termine une campagne (OPEN -> ENDED).
  async endCampaign(campaignId: string) {
    const campaign = await this.prisma.raffleCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campagne introuvable.');
    await this.prisma.raffleCampaign.update({
      where: { id: campaignId },
      data: { status: 'ENDED' },
    });
    return { id: campaignId, status: 'ENDED' };
  }

  /// Supprime une campagne encore en DRAFT (impossible si OPEN/ENDED).
  async deleteCampaign(campaignId: string) {
    const campaign = await this.prisma.raffleCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campagne introuvable.');
    if (campaign.status !== 'DRAFT') {
      throw new BadRequestException('Seules les campagnes en brouillon peuvent être supprimées.');
    }
    await this.prisma.raffleCampaign.delete({ where: { id: campaignId } });
    return { id: campaignId, deleted: true };
  }

  /// Liste toutes les campagnes (pour le panel admin), avec tirages et lots.
  async listCampaigns() {
    const campaigns = await this.prisma.raffleCampaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        draws: {
          orderBy: { scheduledAt: 'asc' },
          include: { prizes: { orderBy: { rank: 'asc' } } },
        },
        _count: { select: { tickets: true } },
      },
    });
    return campaigns.map((c) => ({
      ...this.serializeCampaign(c),
      totalTicketsSold: (c as any)._count?.tickets ?? 0,
    }));
  }

  /// Sérialise une campagne (BigInt -> string).
  private serializeCampaign(c: any) {
    return {
      id: c.id,
      name: c.name,
      description: c.description,
      status: c.status,
      ticketPrice: c.ticketPrice.toString(),
      maxTicketsPerUser: c.maxTicketsPerUser,
      startsAt: c.startsAt,
      endsAt: c.endsAt,
      createdAt: c.createdAt,
      draws: (c.draws ?? []).map((d: any) => ({
        id: d.id,
        label: d.label,
        scheduledAt: d.scheduledAt,
        status: d.status,
        executedAt: d.executedAt,
        prizes: (d.prizes ?? []).map((p: any) => ({
          id: p.id,
          type: p.type,
          label: p.label,
          value: p.value,
          rank: p.rank,
          quantity: p.quantity,
        })),
      })),
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Cron : passe en EXPIRED les lots gagnants non réclamés après le délai
  // ───────────────────────────────────────────────────────────────────────────
  @Cron('0 * * * *') // toutes les heures (même cadence que vip.service)
  async expireUnclaimedPrizes() {
    const now = new Date();
    const expired = await this.prisma.raffleTicket.updateMany({
      where: {
        status: RaffleTicketStatus.WON,
        claimStatus: RaffleClaimStatus.UNCLAIMED,
        claimDeadline: { lt: now },
      },
      data: { claimStatus: RaffleClaimStatus.EXPIRED },
    });

    if (expired.count > 0) {
      this.logger.log(`${expired.count} lot(s) de tombola non réclamé(s) passé(s) en EXPIRED.`);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Mélange Fisher-Yates déterministe à partir d'une graine (audit reproductible)
  // ───────────────────────────────────────────────────────────────────────────
  private shuffleWithSeed<T>(array: T[], seed: string): T[] {
    const arr = [...array];
    // PRNG simple (mulberry32) initialisé par un hash numérique de la graine.
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
      h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
    }
    const rand = this.mulberry32(h >>> 0);

    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  private mulberry32(a: number): () => number {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
}
