import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { WalletService } from '../wallet/wallet.service';
import { AdminService } from './admin.service';
import { AdminWalletActionDto } from './dto/admin-wallet-action.dto';
import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { AdminUpdateStatusDto } from './dto/admin-update-status.dto';
import { CasinoConfigService } from '../casino-config/casino-config.service';


@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminController {
  constructor(
    private readonly walletService: WalletService,
    private readonly adminService: AdminService,
    private readonly casinoConfigService: CasinoConfigService,
  ) { }

  // ── Wallet existant ──────────────────────────────────────
  @Patch('wallet/credit')
  creditWallet(
    @CurrentUser() admin: { userId: string },
    @Body() dto: AdminWalletActionDto,
  ) {
    return this.walletService.adminCredit(
      admin.userId, dto.userId, dto.amount, dto.reason,
    );
  }

  @Patch('wallet/debit')
  debitWallet(
    @CurrentUser() admin: { userId: string },
    @Body() dto: AdminWalletActionDto,
  ) {
    return this.walletService.adminDebit(
      admin.userId, dto.userId, dto.amount, dto.reason,
    );
  }

  @Get('wallet/:userId')
  getWallet(@Param('userId') userId: string) {
    return this.walletService.getWalletByUserId(userId);
  }

  @Get('wallet/:userId/history')
  getWalletHistory(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    return this.walletService.getWalletHistory(
      userId, limit ? parseInt(limit) : 20, true,
    );
  }

  // ── Nouveaux endpoints ───────────────────────────────────
  @Get('users')
  getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Get('stats')
  getGlobalStats() {
    return this.adminService.getGlobalStats();
  }

  @Get('transactions')
  getAllTransactions(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.adminService.getAllTransactions(
      limit ? parseInt(limit) : 50,
      offset ? parseInt(offset) : 0,
    );
  }

  @Get('games')
  getAllGameRounds(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('userId') userId?: string,
  ) {
    return this.adminService.getAllGameRounds(
      limit ? parseInt(limit) : 50,
      offset ? parseInt(offset) : 0,
      userId,
    );
  }

  @Get('leaderboard')
  getLeaderboard() {
    return this.adminService.getLeaderboard();
  }

  @Patch('users/:userId/status')
  updateUserStatus(
    @Param('userId') userId: string,
    @Body() dto: AdminUpdateStatusDto,
  ) {
    return this.adminService.updateUserStatus(userId, dto.status);
  }

  @Get('users/:userId/stats')
  getUserStats(@Param('userId') userId: string) {
    return this.adminService.getUserStats(userId);
  }

  @Get('config')
  getConfig() {
    return this.casinoConfigService.getAll();
  }

  @Patch('config/:key')
  updateConfig(
    @CurrentUser() admin: { userId: string },
    @Param('key') key: string,
    @Body('value') value: string,
  ) {
    return this.casinoConfigService.set(key, value, admin.userId);
  }

  @Get('users/:userId/login-history')
  getUserLoginHistory(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getUserLoginHistory(
      userId,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get('charts/balance')
  getBalanceHistory(@Query('days') days?: string) {
    return this.adminService.getCasinoBalanceHistory(days ? parseInt(days) : 30);
  }

  @Get('charts/games')
  getGamesHistory(@Query('days') days?: string) {
    return this.adminService.getGameRoundsHistory(days ? parseInt(days) : 30);
  }
}