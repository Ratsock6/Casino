import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { BattleBoxService } from './battle-box.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateBattleBoxGameDto } from './dto/create-game.dto';
import { JoinBattleBoxGameDto } from './dto/join-game.dto';
import { MaintenanceGuard, Maintenance } from '../common/guards/maintenance.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

@Controller('battle-box')
@UseGuards(JwtAuthGuard, MaintenanceGuard)
export class BattleBoxController {
  constructor(private readonly battleBoxService: BattleBoxService) { }

  @Get('catalog')
  getCatalog() {
    return this.battleBoxService.getCatalog();
  }

  @Get('lobby')
  getLobby() {
    return this.battleBoxService.getLobby();
  }

  @Get('me')
  getMyGames(@CurrentUser() user: { userId: string }) {
    return this.battleBoxService.getMyGames(user.userId);
  }

  @Get('active')
  getActiveGame(@CurrentUser() user: { userId: string }) {
    return this.battleBoxService.getActiveGame(user.userId);
  }

  @Post('create')
  @Maintenance('MAINTENANCE_BATTLEBOX')
  createGame(
    @CurrentUser() user: { userId: string; role: string },
    @Body() dto: CreateBattleBoxGameDto,
  ) {
    return this.battleBoxService.createGame(user.userId, user.role, dto);
  }

  @Post('join')
  @Maintenance('MAINTENANCE_BATTLEBOX')
  joinGame(
    @CurrentUser() user: { userId: string; role: string },
    @Body() dto: JoinBattleBoxGameDto,
  ) {
    return this.battleBoxService.joinGame(user.userId, user.role, dto);
  }

  @Delete(':gameId')
  cancelGame(
    @CurrentUser() user: { userId: string },
    @Param('gameId') gameId: string,
  ) {
    return this.battleBoxService.cancelGame(user.userId, gameId);
  }

  @Get('by-code/:code')
  getGameByCode(@Param('code') code: string) {
    return this.battleBoxService.getGameByCode(code);
  }

  @Get('admin/games')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  getAllGames(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('userId') userId?: string,
  ) {
    return this.battleBoxService.getAllGames(
      limit ? parseInt(limit) : 50,
      offset ? parseInt(offset) : 0,
      userId,
    );
  }

  @Get(':gameId')
  getGame(@Param('gameId') gameId: string) {
    return this.battleBoxService.getGame(gameId);
  }
}