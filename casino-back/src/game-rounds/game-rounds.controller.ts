import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { GameRoundsService } from './game-rounds.service';

@Controller('game-rounds')
@UseGuards(JwtAuthGuard)
export class GameRoundsController {
  constructor(private readonly gameRoundsService: GameRoundsService) {}

  @Get('me')
  getMyRounds(
    @CurrentUser() user: { userId: string },
    @Query('limit') limit?: string,
  ) {
    return this.gameRoundsService.getMyRounds(
      user.userId,
      limit ? parseInt(limit) : 50,
    );
  }

  @Get('me/stats')
  getMyStats(@CurrentUser() user: { userId: string }) {
    return this.gameRoundsService.getMyStats(user.userId);
  }
}