import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { DiscordService } from './discord.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ConfigService } from '@nestjs/config';
import { CasinoConfigService } from '../casino-config/casino-config.service';
import { WalletService } from '../wallet/wallet.service';

const BOT_SECRET = process.env.DISCORD_BOT_SECRET || 'bot_secret_change_me';

@Controller('discord')
export class DiscordController {
  constructor(
    private readonly discordService: DiscordService,
    private readonly configService: ConfigService,
    private readonly casinoConfigService: CasinoConfigService,
    private readonly walletService: WalletService,
  ) { }

  @Post('generate-code')
  async generateCode(
    @Body() body: { discordId: string; discordUsername: string; secret: string },
  ) {
    const BOT_SECRET = process.env.DISCORD_BOT_SECRET;
    console.log('Secret reçu:', body.secret);
    console.log('Secret attendu:', BOT_SECRET);

    if (body.secret !== BOT_SECRET) {
      return { error: 'Unauthorized' };
    }
    const code = await this.discordService.generateLinkCode(body.discordId, body.discordUsername);
    return { code };
  }


  // Appelé par le site web pour valider le code
  @Post('link')
  @UseGuards(JwtAuthGuard)
  async linkAccount(
    @CurrentUser() user: { userId: string },
    @Body('code') code: string,
  ) {
    const result = await this.discordService.validateLinkCode(user.userId, code);

    // Notifie le bot pour appliquer le rôle et le pseudo.
    // L'URL est réglable depuis l'admin (table CasinoConfig). On retombe sur le
    // .env puis sur localhost:3001 si rien n'est configuré.
    const botWebhookUrl =
      (await this.casinoConfigService.get('DISCORD_BOT_WEBHOOK_URL')) ||
      this.configService.get<string>('DISCORD_BOT_WEBHOOK_URL') ||
      'http://localhost:3001';

    console.log('[link] Notification du bot →', `${botWebhookUrl}/linked`, 'role:', result.role);
    try {
      const resp = await fetch(`${botWebhookUrl}/linked`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: this.configService.get<string>('DISCORD_BOT_SECRET') || process.env.DISCORD_BOT_SECRET,
          discordId: result.discordId,
          firstName: result.firstName,
          lastName: result.lastName,
          phoneNumber: result.phoneNumber,
          role: result.role,
        }),
      });
      console.log('[link] Réponse du bot:', resp.status);
    } catch (err) {
      console.error('[link] Erreur notification bot:', err);
    }

    return { message: 'Compte Discord lié avec succès !' };
  }

  // Appelé par le bot pour récupérer les infos
  @Get('user/:discordId')
  async getUserByDiscordId(
    @Param('discordId') discordId: string,
    @Body() body: { secret: string },
  ) {
    return this.discordService.getInfosByDiscordId(discordId);
  }

  // Délier depuis le site web
  @Delete('link')
  @UseGuards(JwtAuthGuard)
  async unlinkAccount(@CurrentUser() user: { userId: string }) {
    const { discordId } = await this.discordService.unlinkDiscord(user.userId);

    // Notifie le bot pour retirer les rôles casino (si un Discord était lié).
    if (discordId) {
      const botWebhookUrl =
        (await this.casinoConfigService.get('DISCORD_BOT_WEBHOOK_URL')) ||
        this.configService.get<string>('DISCORD_BOT_WEBHOOK_URL') ||
        'http://localhost:3001';

      console.log('[unlink] Notification du bot →', `${botWebhookUrl}/unlinked`, 'discordId:', discordId);
      try {
        const resp = await fetch(`${botWebhookUrl}/unlinked`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            secret: this.configService.get<string>('DISCORD_BOT_SECRET') || process.env.DISCORD_BOT_SECRET,
            discordId,
          }),
        });
        console.log('[unlink] Réponse du bot:', resp.status);
      } catch (err) {
        console.error('[unlink] Erreur notification bot:', err);
      }
    }

    return { message: 'Compte Discord délié avec succès.' };
  }

  @Post('notify-linked')
  async notifyLinked(
    @Body() body: {
      discordId: string;
      username: string;
      firstName: string;
      lastName: string;
      phoneNumber: string;
      role: string;
      secret: string;
    },
  ) {
    const BOT_SECRET = this.configService.get<string>('DISCORD_BOT_SECRET');
    if (body.secret !== BOT_SECRET) return { error: 'Unauthorized' };
    return { success: true };
  }

  @Get('linked-users')
  async getLinkedUsers(@Query('secret') secret: string) {
    const BOT_SECRET = this.configService.get<string>('DISCORD_BOT_SECRET');
    if (secret !== BOT_SECRET) return { error: 'Unauthorized' };
    return this.discordService.getLinkedUsers();
  }

  // Appelé par le bot quand un staff clique sur "Créditer (payé)" dans un ticket.
  // Crédite le joueur en jetons PAYÉS (revenu casino), avec traçabilité de l'admin Discord.
  @Post('credit-paid')
  async creditPaidFromDiscord(
    @Body() body: {
      secret: string;
      discordId: string;       // joueur à créditer
      amount: number;
      adminDiscordId?: string; // staff qui a cliqué
      adminTag?: string;       // nom lisible du staff (pour l'historique)
    },
  ) {
    const BOT_SECRET = this.configService.get<string>('DISCORD_BOT_SECRET') || process.env.DISCORD_BOT_SECRET;
    if (body.secret !== BOT_SECRET) {
      return { error: 'Unauthorized' };
    }

    if (!body.discordId || !body.amount || body.amount <= 0) {
      return { error: 'Paramètres invalides' };
    }

    // Résout le joueur casino à partir de son discordId
    const userId = await this.discordService.resolveUserIdByDiscordId(body.discordId);
    if (!userId) {
      return { error: 'Joueur non lié à un compte casino' };
    }

    // Tente de résoudre l'admin (s'il a lié son Discord) pour l'attribuer dans l'historique
    const adminUserId = body.adminDiscordId
      ? await this.discordService.resolveUserIdByDiscordId(body.adminDiscordId)
      : null;

    const adminLabel = body.adminTag ? ` (par ${body.adminTag} via Discord)` : ' (via Discord)';
    const reason = `Achat de jetons${adminLabel}`;

    const result = await this.walletService.adminCredit(
      adminUserId ?? 'SYSTEM',
      userId,
      body.amount,
      reason,
      true, // isPaid = true : jetons payés = revenu
    );

    return { success: true, ...result };
  }
}
