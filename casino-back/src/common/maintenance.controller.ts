import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CasinoConfigService } from '../casino-config/casino-config.service';

// Rôles autorisés à contourner la maintenance (doit rester aligné avec MaintenanceGuard).
const MAINTENANCE_BYPASS_ROLES = ['ADMIN', 'SUPER_ADMIN'];

@Controller('maintenance')
@UseGuards(JwtAuthGuard)
export class MaintenanceController {
  constructor(private readonly casinoConfigService: CasinoConfigService) {}

  // Renvoie l'état de maintenance + si l'utilisateur courant peut le contourner.
  // Le front s'en sert pour décider : écran de maintenance (joueur) vs bandeau discret (admin).
  @Get('status')
  async status(@CurrentUser() user: { userId: string; role: string }) {
    const [global, slots, roulette, blackjack, battlebox] = await Promise.all([
      this.casinoConfigService.getBoolean('MAINTENANCE_GLOBAL', false),
      this.casinoConfigService.getBoolean('MAINTENANCE_SLOTS', false),
      this.casinoConfigService.getBoolean('MAINTENANCE_ROULETTE', false),
      this.casinoConfigService.getBoolean('MAINTENANCE_BLACKJACK', false),
      this.casinoConfigService.getBoolean('MAINTENANCE_BATTLEBOX', false),
    ]);

    const canBypass = MAINTENANCE_BYPASS_ROLES.includes(user.role);

    return {
      global,
      SLOTS: slots,
      ROULETTE: roulette,
      BLACKJACK: blackjack,
      BATTLE_BOX: battlebox,
      canBypass, // true = admin : le front affiche un bandeau au lieu de bloquer
    };
  }
}
