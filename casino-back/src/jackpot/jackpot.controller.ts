import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JackpotService } from './jackpot.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('jackpot')
export class JackpotController {
  constructor(private readonly jackpotService: JackpotService) {}

  @Get()
  getJackpot() {
    return this.jackpotService.getJackpot();
  }

  @Get('history')
  getHistory() {
    return this.jackpotService.getJackpotHistory();
  }

  @Post('reset')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  resetJackpot(@CurrentUser() admin: { userId: string }) {
    return this.jackpotService.resetJackpot(admin.userId);
  }
}