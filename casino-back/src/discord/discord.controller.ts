import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { DiscordService } from './discord.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ConfigService } from '@nestjs/config';

const BOT_SECRET = process.env.DISCORD_BOT_SECRET || 'bot_secret_change_me';

@Controller('discord')
export class DiscordController {
  constructor(
    private readonly discordService: DiscordService,
    private readonly configService: ConfigService,
  ) { }

  @Post('generate-code')
  async generateCode(
    @Body() body: { discordId: string; discordUsername: string; secret: string },
  ) {
    const BOT_SECRET = this.configService.get<string>('DISCORD_BOT_SECRET');
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

    // Notifie le bot pour appliquer le rôle et le pseudo
    const botWebhookUrl = this.configService.get<string>('DISCORD_BOT_WEBHOOK_URL');
    if (botWebhookUrl) {
      try {
        await fetch(`${botWebhookUrl}/linked`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            secret: this.configService.get<string>('DISCORD_BOT_SECRET'),
            discordId: result.discordId,
            firstName: result.firstName,
            lastName: result.lastName,
            phoneNumber: result.phoneNumber,
            role: result.role,
          }),
        });
      } catch (err) {
        console.error('Erreur notification bot:', err);
      }
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
    await this.discordService.unlinkDiscord(user.userId);
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
}