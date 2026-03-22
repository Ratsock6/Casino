import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DiscordService {
  constructor(private readonly prisma: PrismaService) { }

  // Génère un code de liaison temporaire
  async generateLinkCode(discordId: string, discordUsername: string): Promise<string> {
    // Vérifie si ce Discord est déjà lié
    const existing = await this.prisma.user.findUnique({
      where: { discordId },
    });

    if (existing) {
      throw new BadRequestException(
        `Ce compte Discord est déjà lié au compte casino **${existing.username}**.`
      );
    }

    // Stocke le code dans CasinoConfig temporairement
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const key = `DISCORD_LINK_${code}`;

    await this.prisma.casinoConfig.upsert({
      where: { key },
      update: {
        value: JSON.stringify({ discordId, discordUsername, expiresAt: Date.now() + 10 * 60 * 1000 }),
        updatedAt: new Date(),
      },
      create: {
        key,
        value: JSON.stringify({ discordId, discordUsername, expiresAt: Date.now() + 10 * 60 * 1000 }),
      },
    });

    return code;
  }

  // Valide le code depuis le site web
  async validateLinkCode(userId: string, code: string): Promise<void> {
    const key = `DISCORD_LINK_${code.toUpperCase()}`;

    const config = await this.prisma.casinoConfig.findUnique({
      where: { key },
    });

    if (!config) {
      throw new NotFoundException('Code invalide ou expiré.');
    }

    const data = JSON.parse(config.value);

    if (Date.now() > data.expiresAt) {
      await this.prisma.casinoConfig.delete({ where: { key } });
      throw new BadRequestException('Ce code a expiré. Génère-en un nouveau avec /lier.');
    }

    // Vérifie que l'utilisateur n'est pas déjà lié
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.discordId) {
      throw new BadRequestException('Votre compte casino est déjà lié à un compte Discord.');
    }

    // Lie le compte
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        discordId: data.discordId,
        discordUsername: data.discordUsername,
      },
    });

    // Supprime le code
    await this.prisma.casinoConfig.delete({ where: { key } });
  }

  // Récupère les infos depuis Discord
  async getInfosByDiscordId(discordId: string) {
    const user = await this.prisma.user.findUnique({
      where: { discordId },
      include: { wallet: true },
    });

    if (!user) {
      throw new NotFoundException('Aucun compte casino lié à ce Discord.');
    }

    return {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      role: user.role,
      balance: Number(user.wallet?.balance || 0),
      discordUsername: user.discordUsername,
    };
  }

  // Délie un compte Discord
  async unlinkDiscord(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { discordId: null, discordUsername: null },
    });
  }
}