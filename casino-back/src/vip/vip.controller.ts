import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { VipService } from './vip.service';
import { BuyVipDto } from './dto/buy-vip.dto';

@Controller('vip')
@UseGuards(JwtAuthGuard)
export class VipController {
  constructor(private readonly vipService: VipService) {}

  @Get('prices')
  getPrices() {
    return this.vipService.getPrices();
  }

  @Get('status')
  getMyVipStatus(@CurrentUser() user: { userId: string }) {
    return this.vipService.getMyVipStatus(user.userId);
  }

  @Post('buy')
  buyVip(
    @CurrentUser() user: { userId: string },
    @Body() dto: BuyVipDto,
  ) {
    return this.vipService.buyVip(user.userId, dto.duration);
  }
}