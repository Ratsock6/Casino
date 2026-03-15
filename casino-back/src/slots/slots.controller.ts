import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SpinSlotsDto } from './dto/spin-slots.dto';
import { SlotsService } from './slots.service';

@Controller('slots')
@UseGuards(JwtAuthGuard)
export class SlotsController {
  constructor(private readonly slotsService: SlotsService) {}

  @Post('spin')
  spin(
    @CurrentUser() user: { userId: string },
    @Body() dto: SpinSlotsDto,
  ) {
    return this.slotsService.spin(user.userId, dto.bet);
  }
}