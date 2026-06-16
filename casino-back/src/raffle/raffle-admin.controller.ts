import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RaffleAdminService } from './raffle-admin.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';

@Controller('admin/raffle')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class RaffleAdminController {
  constructor(private readonly raffleAdminService: RaffleAdminService) {}

  // ── Campagnes ──────────────────────────────────────────────────────────────

  /// Liste toutes les campagnes (avec tirages, lots, nb de tickets vendus).
  @Get('campaigns')
  async listCampaigns() {
    return this.raffleAdminService.listCampaigns();
  }

  /// Crée une campagne complète (campagne + tirages + lots).
  @Post('campaigns')
  async createCampaign(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateCampaignDto,
  ) {
    return this.raffleAdminService.createCampaign(user.userId, dto);
  }

  /// Ouvre une campagne (la rend disponible aux achats).
  @Post('campaigns/:id/open')
  async openCampaign(@Param('id') id: string) {
    return this.raffleAdminService.openCampaign(id);
  }

  /// Termine une campagne.
  @Post('campaigns/:id/end')
  async endCampaign(@Param('id') id: string) {
    return this.raffleAdminService.endCampaign(id);
  }

  /// Supprime une campagne en brouillon.
  @Delete('campaigns/:id')
  async deleteCampaign(@Param('id') id: string) {
    return this.raffleAdminService.deleteCampaign(id);
  }

  // ── Tirages & gagnants ───────────────────────────────────────────────────────

  /// Déclenche manuellement un tirage donné.
  @Post('draws/:drawId/execute')
  async executeDraw(@Param('drawId') drawId: string) {
    return this.raffleAdminService.executeDraw(drawId);
  }

  /// Liste des gagnants (toutes campagnes, ou filtrée par campaignId).
  @Get('winners')
  async winners(@Query('campaignId') campaignId?: string) {
    return this.raffleAdminService.getWinners(campaignId);
  }

  /// Marque un lot comme réclamé/remis.
  @Post('tickets/:ticketId/claim')
  async markClaimed(@Param('ticketId') ticketId: string) {
    return this.raffleAdminService.markClaimed(ticketId);
  }
}
