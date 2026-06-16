import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  WalletTransactionType,
  RaffleCampaignStatus,
  RaffleTicketStatus,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CasinoGateway } from '../gateway/casino.gateway';

@Injectable()
export class RaffleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: CasinoGateway,
  ) {}

  // ───────────────────────────────────────────────────────────────────────────
  // Achat de tickets — cœur transactionnel (aligné sur WalletService)
  // ───────────────────────────────────────────────────────────────────────────
  async buyTickets(userId: string, quantity: number) {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new BadRequestException('La quantité doit être un entier positif.');
    }

    const result = await this.prisma.$transaction(
      async (tx) => {
        // 1) Récupère la campagne active (OPEN)
        const campaign = await tx.raffleCampaign.findFirst({
          where: { status: RaffleCampaignStatus.OPEN },
          orderBy: { startsAt: 'desc' },
        });
        if (!campaign) {
          throw new BadRequestException("Aucune tombola n'est ouverte actuellement.");
        }

        // 2) Vérifie la fenêtre temporelle
        const now = new Date();
        if (now < campaign.startsAt) {
          throw new BadRequestException("La tombola n'a pas encore commencé.");
        }
        if (now > campaign.endsAt) {
          throw new BadRequestException('La tombola est terminée.');
        }

        // 3) Vérifie le plafond global du joueur sur cette campagne
        const alreadyOwned = await tx.raffleTicket.count({
          where: { campaignId: campaign.id, userId },
        });
        if (alreadyOwned + quantity > campaign.maxTicketsPerUser) {
          const remaining = Math.max(0, campaign.maxTicketsPerUser - alreadyOwned);
          throw new BadRequestException(
            `Plafond atteint : vous pouvez encore acheter ${remaining} ticket(s) (max ${campaign.maxTicketsPerUser} par joueur).`,
          );
        }

        // 4) Calcule le coût total et débite le wallet
        const totalCost = campaign.ticketPrice * BigInt(quantity);

        const wallet = await tx.wallet.findUnique({ where: { userId } });
        if (!wallet) throw new NotFoundException('Portefeuille introuvable.');

        const balanceBefore = wallet.balance;
        if (balanceBefore < totalCost) {
          throw new BadRequestException('Solde insuffisant pour acheter ces tickets.');
        }
        const balanceAfter = balanceBefore - totalCost;

        await tx.wallet.update({
          where: { userId },
          data: { balance: balanceAfter },
        });

        await tx.walletTransaction.create({
          data: {
            userId,
            type: WalletTransactionType.RAFFLE_TICKET, // achat de tickets de tombola
            amount: totalCost,
            balanceBefore,
            balanceAfter,
            reason: `Achat de ${quantity} ticket(s) de tombola — ${campaign.name}`,
          },
        });

        // 5) Détermine le prochain numéro de ticket séquentiel pour cette campagne
        const last = await tx.raffleTicket.findFirst({
          where: { campaignId: campaign.id },
          orderBy: { ticketNumber: 'desc' },
          select: { ticketNumber: true },
        });
        const startNumber = (last?.ticketNumber ?? 0) + 1;

        // 6) Crée les N tickets en ACTIVE
        const ticketsData = Array.from({ length: quantity }, (_, i) => ({
          campaignId: campaign.id,
          userId,
          ticketNumber: startNumber + i,
          status: RaffleTicketStatus.ACTIVE,
        }));
        await tx.raffleTicket.createMany({ data: ticketsData });

        return {
          campaignId: campaign.id,
          campaignName: campaign.name,
          quantity,
          ticketNumbers: ticketsData.map((t) => t.ticketNumber),
          totalCost: totalCost.toString(),
          balanceBefore: balanceBefore.toString(),
          balanceAfter: balanceAfter.toString(),
          totalOwned: alreadyOwned + quantity,
          maxTicketsPerUser: campaign.maxTicketsPerUser,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    // Notification temps réel (hors transaction)
    this.gateway.notifyUser(userId, 'raffle:tickets_purchased', {
      quantity: result.quantity,
      totalCost: result.totalCost,
      newBalance: result.balanceAfter,
      message: `🎟️ Vous avez acheté ${result.quantity} ticket(s) de tombola !`,
    });

    return result;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Consultations
  // ───────────────────────────────────────────────────────────────────────────

  /// Campagne actuellement ouverte + prochain tirage + total de tickets vendus.
  async getActiveCampaign() {
    const campaign = await this.prisma.raffleCampaign.findFirst({
      where: { status: RaffleCampaignStatus.OPEN },
      orderBy: { startsAt: 'desc' },
      include: {
        draws: {
          orderBy: { scheduledAt: 'asc' },
          include: { prizes: { orderBy: { rank: 'asc' } } },
        },
      },
    });

    if (!campaign) return null;

    const totalTicketsSold = await this.prisma.raffleTicket.count({
      where: { campaignId: campaign.id },
    });

    const now = new Date();
    const nextDraw = campaign.draws.find(
      (d) => d.status === 'PENDING' && d.scheduledAt > now,
    );

    return {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      status: campaign.status,
      ticketPrice: campaign.ticketPrice.toString(),
      maxTicketsPerUser: campaign.maxTicketsPerUser,
      startsAt: campaign.startsAt,
      endsAt: campaign.endsAt,
      totalTicketsSold,
      nextDrawAt: nextDraw?.scheduledAt ?? null,
      draws: campaign.draws.map((d) => ({
        id: d.id,
        label: d.label,
        scheduledAt: d.scheduledAt,
        status: d.status,
        executedAt: d.executedAt,
        prizes: d.prizes.map((p) => ({
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

  /// Les tickets du joueur sur la campagne active (actifs + gagnants).
  async getMyTickets(userId: string) {
    const campaign = await this.prisma.raffleCampaign.findFirst({
      where: { status: RaffleCampaignStatus.OPEN },
      orderBy: { startsAt: 'desc' },
      select: { id: true, name: true, maxTicketsPerUser: true },
    });
    if (!campaign) return { campaign: null, tickets: [], totalOwned: 0 };

    const tickets = await this.prisma.raffleTicket.findMany({
      where: { campaignId: campaign.id, userId },
      orderBy: { ticketNumber: 'asc' },
      include: {
        wonPrize: true,
        wonDraw: { select: { id: true, label: true, scheduledAt: true } },
      },
    });

    return {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        maxTicketsPerUser: campaign.maxTicketsPerUser,
      },
      totalOwned: tickets.length,
      tickets: tickets.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        status: t.status,
        purchasedAt: t.purchasedAt,
        claimStatus: t.claimStatus,
        claimDeadline: t.claimDeadline,
        claimedAt: t.claimedAt,
        wonPrize: t.wonPrize
          ? {
              type: t.wonPrize.type,
              label: t.wonPrize.label,
              value: t.wonPrize.value,
            }
          : null,
        wonDraw: t.wonDraw,
      })),
    };
  }
}
