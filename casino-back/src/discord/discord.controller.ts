import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
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
    await this.discordService.validateLinkCode(user.userId, code);
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
}