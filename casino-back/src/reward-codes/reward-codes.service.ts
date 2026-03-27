import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { VipService } from '../vip/vip.service';
import { CreateRewardCodeDto } from './dto/create-code.dto';

@Injectable()
export class RewardCodesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly vipService: VipService,
  ) {}

  // ─── Admin : créer un code ────────────────────────────────────────────────
  async createCode(adminId: string, dto: CreateRewardCodeDto) {
    const existing = await this.prisma.rewardCode.findUnique({
      where: { code: dto.code.toUpperCase() },
    });
    if (existing) throw new BadRequestException('Ce code existe déjà.');

    return this.prisma.rewardCode.create({
      data: {
        code: dto.code.toUpperCase(),
        description: dto.description,
        rewardType: dto.rewardType,
        rewardValue: dto.rewardValue,
        maxUses: dto.maxUses || null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        createdBy: adminId,
      },
    });
  }

  // ─── Admin : liste tous les codes ─────────────────────────────────────────
  async getAllCodes() {
    const codes = await this.prisma.rewardCode.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { uses: true } },
        uses: {
          include: { user: { select: { username: true } } },
          orderBy: { usedAt: 'desc' },
          take: 5,
        },
      },
    });

    return codes.map((c) => ({
      id: c.id,
      code: c.code,
      description: c.description,
      rewardType: c.rewardType,
      rewardValue: c.rewardValue,
      maxUses: c.maxUses,
      currentUses: c.currentUses,
      expiresAt: c.expiresAt,
      isActive: c.isActive,
      createdAt: c.createdAt,
      recentUses: c.uses.map((u) => ({
        username: u.user.username,
        usedAt: u.usedAt,
      })),
      isExpired: c.expiresAt ? new Date(c.expiresAt) < new Date() : false,
      isFull: c.maxUses ? c.currentUses >= c.maxUses : false,
    }));
  }

  // ─── Admin : activer/désactiver un code ───────────────────────────────────
  async toggleCode(codeId: string) {
    const code = await this.prisma.rewardCode.findUnique({ where: { id: codeId } });
    if (!code) throw new NotFoundException('Code introuvable.');

    return this.prisma.rewardCode.update({
      where: { id: codeId },
      data: { isActive: !code.isActive },
    });
  }

  // ─── Admin : supprimer un code ────────────────────────────────────────────
  async deleteCode(codeId: string) {
    await this.prisma.rewardCode.delete({ where: { id: codeId } });
    return { message: 'Code supprimé.' };
  }

  // ─── Joueur : utiliser un code ────────────────────────────────────────────
  async useCode(userId: string, code: string) {
    const rewardCode = await this.prisma.rewardCode.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!rewardCode) throw new NotFoundException('Code invalide.');
    if (!rewardCode.isActive) throw new BadRequestException('Ce code est désactivé.');
    if (rewardCode.expiresAt && new Date(rewardCode.expiresAt) < new Date()) {
      throw new BadRequestException('Ce code a expiré.');
    }
    if (rewardCode.maxUses && rewardCode.currentUses >= rewardCode.maxUses) {
      throw new BadRequestException('Ce code a atteint son nombre maximum d\'utilisations.');
    }

    // Vérifie si le joueur a déjà utilisé ce code
    const alreadyUsed = await this.prisma.rewardCodeUse.findUnique({
      where: { codeId_userId: { codeId: rewardCode.id, userId } },
    });
    if (alreadyUsed) throw new BadRequestException('Vous avez déjà utilisé ce code.');

    // Applique la récompense
    const result = await this.applyReward(userId, rewardCode);

    // Enregistre l'utilisation
    await this.prisma.$transaction([
      this.prisma.rewardCodeUse.create({
        data: { codeId: rewardCode.id, userId },
      }),
      this.prisma.rewardCode.update({
        where: { id: rewardCode.id },
        data: { currentUses: { increment: 1 } },
      }),
      this.prisma.adminAction.create({
        data: {
          adminId: null,
          action: 'REWARD_CODE_USED',
          targetType: 'USER',
          targetId: userId,
          metadata: {
            code: rewardCode.code,
            rewardType: rewardCode.rewardType,
            rewardValue: rewardCode.rewardValue,
          },
        },
      }),
    ]);

    return {
      message: result.message,
      rewardType: rewardCode.rewardType,
      rewardValue: rewardCode.rewardValue,
      description: rewardCode.description,
      isIngame: rewardCode.rewardType === 'INGAME',
    };
  }

  private async applyReward(userId: string, code: any): Promise<{ message: string }> {
    switch (code.rewardType) {
      case 'TOKENS': {
        const amount = parseInt(code.rewardValue);
        if (isNaN(amount) || amount <= 0) throw new BadRequestException('Valeur de récompense invalide.');
        await this.walletService.adminCredit('SYSTEM', userId, amount, `🎁 Code promo : ${code.code}`);
        return { message: `✅ ${amount.toLocaleString()} jetons crédités sur votre compte !` };
      }

      case 'VIP': {
        await this.vipService.adminGrantVip('SYSTEM', userId, code.rewardValue as any);
        return { message: `✅ Statut VIP activé (${code.rewardValue}) !` };
      }

      case 'BADGE': {
        // Stocke le badge dans les metadata du joueur
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        const metadata = (user?.metadata as any) || {};
        const badges = metadata.badges || [];
        if (!badges.includes(code.rewardValue)) badges.push(code.rewardValue);
        await this.prisma.user.update({
          where: { id: userId },
          data: { metadata: { ...metadata, badges } },
        });
        return { message: `✅ Badge "${code.rewardValue}" ajouté à votre profil !` };
      }

      case 'INGAME': {
        // Pas de crédit automatique — le staff remet en jeu
        return { message: `✅ Code validé ! Contactez le staff en jeu pour récupérer : ${code.rewardValue}` };
      }

      default:
        throw new BadRequestException('Type de récompense inconnu.');
    }
  }
}