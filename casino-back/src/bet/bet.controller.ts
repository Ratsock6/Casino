import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { BetService } from './bet.service';
import type {
  PlaceBetInput,
  RefundBetInput,
  SettleLossInput,
  SettleWinInput,
} from './types/bet.types';

@Controller('bet')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class BetController {
  constructor(private readonly betService: BetService) {}

  @Post('place')
  placeBet(@Body() body: PlaceBetInput) {
    return this.betService.placeBet(body);
  }

  @Patch('win')
  settleWin(@Body() body: SettleWinInput) {
    return this.betService.settleWin(body);
  }

  @Patch('loss')
  settleLoss(@Body() body: SettleLossInput) {
    return this.betService.settleLoss(body);
  }

  @Patch('refund')
  refundBet(@Body() body: RefundBetInput) {
    return this.betService.refundBet(body);
  }

  @Get('round/:roundId')
  getRound(@Param('roundId') roundId: string) {
    return this.betService.getRoundById(roundId);
  }
}