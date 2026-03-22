import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CasinoConfigService } from '../casino-config/casino-config.service';
import { VipDuration } from './dto/buy-vip.dto';

const DURATION_LABELS: Record<VipDuration, string> = {
  '1_MONTH':    '1 mois',
  '3_MONTHS':   '3 mois',
  '6_MONTHS':   '6 mois',
  'LIFETIME':   'À vie',
};

const DURATION_CONFIG_KEYS: Record<VipDuration, string> = {
  '1_MONTH':    'VIP_PRICE_1_MONTH',
  '3_MONTHS':   'VIP_PRICE_3_MONTHS',
  '6_MONTHS':   'VIP_PRICE_6_MONTHS',
  'LIFETIME':   'VIP_PRICE_LIFETIME',
};

@Injectable()
export class VipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly casinoConfigService: CasinoConfigService,
  ) {}

  async getPrices() {
    const [m1, m3, m6, lifetime] = await Promise.all([
      this.casinoConfigService.get('VIP_PRICE_1_MONTH'),
      this.casinoConfigService.get('VIP_PRICE_3_MONTHS'),
      this.casinoConfigService.get('VIP_PRICE_6_MONTHS'),
      this.casinoConfigService.get('VIP_PRICE_LIFETIME'),
    ]);

    return [
      { duration: '1_MONTH',    label: '1 mois',   price: parseInt(m1 || '50000'),      originalPrice: null },
      { duration: '3_MONTHS',   label: '3 mois',   price: parseInt(m3 || '120000'),     originalPrice: parseInt(m1 || '50000') * 3 },
      { duration: '6_MONTHS',   label: '6 mois',   price: parseInt(m6 || '200000'),     originalPrice: parseInt(m1 || '50000') * 6 },
      { duration: 'LIFETIME',   label: 'À vie',    price: parseInt(lifetime || '500000'), originalPrice: null },
    ];
  }

  async buyVip(userId: string, duration: VipDuration) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });

    if (!user) throw new NotFoundException('Utilisateur introuvable');

    // Récupère le prix
    const configKey = DURATION_CONFIG_KEYS[duration];
    const priceStr = await this.casinoConfigService.get(configKey);
    const price = parseInt(priceStr || '0');

    if (price <= 0) throw new BadRequestException('Prix invalide');

    // Vérifie le solde
    const balance = Number(user.wallet?.balance || 0);
    if (balance < price) {
      throw new BadRequestException(
        `Solde insuffisant. Vous avez ${balance.toLocaleString()} jetons, prix : ${price.toLocaleString()} jetons.`
      );
    }

    // Calcule la date d'expiration
    const expiresAt = this.calculateExpiresAt(duration, user);

    return this.prisma.$transaction(async (tx) => {
      // Déduit les jetons
      await tx.wallet.update({
        where: { userId },
        data: { balance: { decrement: BigInt(price) } },
      });

      // Crée la transaction
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      await tx.walletTransaction.create({
        data: {
          userId,
          type: 'ADMIN_DEBIT',
          amount: BigInt(price),
          balanceBefore: BigInt(balance),
          balanceAfter: BigInt(balance - price),
          reason: `Achat VIP — ${DURATION_LABELS[duration]}`,
        },
      });

      // Crée la subscription
      const subscription = await tx.vipSubscription.create({
        data: {
          userId,
          duration,
          price,
          expiresAt,
        },
      });

      // Met à jour le rôle
      await tx.user.update({
        where: { id: userId },
        data: { role: 'VIP' },
      });

      // Log d'audit
      await tx.adminAction.create({
        data: {
          adminId: null,
          action: 'VIP_PURCHASE',
          targetType: 'USER',
          targetId: userId,
          metadata: {
            duration,
            price,
            expiresAt: expiresAt?.toISOString() || 'LIFETIME',
            label: DURATION_LABELS[duration],
          },
        },
      });

      return {
        message: `🎉 VIP activé pour ${DURATION_LABELS[duration]} !`,
        expiresAt,
        price,
        newBalance: balance - price,
      };
    });
  }

  private calculateExpiresAt(duration: VipDuration, user: any): Date | null {
    if (duration === 'LIFETIME') return null;

    // Si déjà VIP, prolonge depuis la date d'expiration actuelle
    const now = new Date();
    let baseDate = now;

    const activeSub = user.vipSubscriptions?.find(
      (s: any) => s.expiresAt && new Date(s.expiresAt) > now
    );

    if (activeSub) baseDate = new Date(activeSub.expiresAt);

    const date = new Date(baseDate);
    if (duration === '1_MONTH')    date.setMonth(date.getMonth() + 1);
    if (duration === '3_MONTHS')   date.setMonth(date.getMonth() + 3);
    if (duration === '6_MONTHS')   date.setMonth(date.getMonth() + 6);

    return date;
  }

  async getMyVipStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        vipSubscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const isVip = user.role === 'VIP';
    const lastSub = user.vipSubscriptions[0];

    return {
      isVip,
      role: user.role,
      subscription: lastSub ? {
        duration: lastSub.duration,
        startedAt: lastSub.startedAt,
        expiresAt: lastSub.expiresAt,
        isLifetime: !lastSub.expiresAt,
        daysLeft: lastSub.expiresAt
          ? Math.ceil((new Date(lastSub.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null,
      } : null,
    };
  }

  // Cron job — expire les VIP toutes les heures
  @Cron('0 * * * *')
  async expireVipSubscriptions() {
    const expired = await this.prisma.user.findMany({
      where: {
        role: 'VIP',
        vipSubscriptions: {
          some: {
            expiresAt: { lte: new Date() },
          },
        },
      },
      include: {
        vipSubscriptions: {
          where: { expiresAt: { lte: new Date() } },
          orderBy: { expiresAt: 'desc' },
          take: 1,
        },
      },
    });

    for (const user of expired) {
      // Vérifie qu'il n'a pas de sub active ou lifetime
      const hasActive = await this.prisma.vipSubscription.findFirst({
        where: {
          userId: user.id,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      });

      if (!hasActive) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { role: 'PLAYER' },
        });
        console.log(`⏰ VIP expiré : ${user.username}`);
      }
    }
  }
}