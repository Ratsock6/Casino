import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { WalletService } from '../wallet/wallet.service';
import { AdminService } from './admin.service';
import { AdminWalletActionDto } from './dto/admin-wallet-action.dto';
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminUpdateStatusDto } from './dto/admin-update-status.dto';
import { CasinoConfigService } from '../casino-config/casino-config.service';
import { ReportsService } from '../reports/reports.service';
import { VipService } from 'src/vip/vip.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminController {
  constructor(
    private readonly walletService: WalletService,
    private readonly adminService: AdminService,
    private readonly casinoConfigService: CasinoConfigService,
    private readonly reportsService: ReportsService,
    private readonly vipService: VipService,
  ) { }

  @Patch('wallet/credit')
  async creditWallet(
    @CurrentUser() admin: { userId: string },
    @Body() dto: AdminWalletActionDto,
  ) {
    const result = await this.walletService.adminCredit(
      admin.userId, dto.userId, dto.amount, dto.reason,
    );
    await this.adminService.createAuditLog(
      admin.userId, 'WALLET_CREDIT', 'USER', dto.userId,
      { amount: dto.amount, reason: dto.reason },
    );
    return result;
  }

  @Patch('wallet/debit')
  async debitWallet(
    @CurrentUser() admin: { userId: string },
    @Body() dto: AdminWalletActionDto,
  ) {
    const result = await this.walletService.adminDebit(
      admin.userId, dto.userId, dto.amount, dto.reason,
    );
    await this.adminService.createAuditLog(
      admin.userId, 'WALLET_DEBIT', 'USER', dto.userId,
      { amount: dto.amount, reason: dto.reason },
    );
    return result;
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

  @Get('users')
  getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Patch('users/:userId/status')
  async updateUserStatus(
    @CurrentUser() admin: { userId: string },
    @Param('userId') userId: string,
    @Body() dto: AdminUpdateStatusDto,
  ) {
    const result = await this.adminService.updateUserStatus(userId, dto.status);
    await this.adminService.createAuditLog(
      admin.userId, 'USER_STATUS_CHANGE', 'USER', userId,
      { newStatus: dto.status },
    );
    return result;
  }

  @Get('users/:userId/stats')
  getUserStats(@Param('userId') userId: string) {
    return this.adminService.getUserStats(userId);
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

  @Get('config')
  getConfig() {
    return this.casinoConfigService.getAll();
  }

  @Patch('config/:key')
  async updateConfig(
    @CurrentUser() admin: { userId: string },
    @Param('key') key: string,
    @Body('value') value: string,
  ) {
    await this.casinoConfigService.set(key, value, admin.userId);
    await this.adminService.createAuditLog(
      admin.userId, 'CONFIG_UPDATE', 'CONFIG', key,
      { key, newValue: value },
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

  @Get('audit-logs')
  getAuditLogs(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.adminService.getAuditLogs(
      limit ? parseInt(limit) : 50,
      offset ? parseInt(offset) : 0,
    );
  }

  @Get('alerts')
  getAlerts(@Query('limit') limit?: string) {
    return this.adminService.getAlerts(
      limit ? parseInt(limit) : 50,
    );
  }

  @Post('reports/daily')
  triggerDailyReport() {
    return this.reportsService.triggerManualReport();
  }


  @Patch('users/:userId/role')
  @Roles('SUPER_ADMIN')
  async updateUserRole(
    @CurrentUser() admin: { userId: string },
    @Param('userId') userId: string,
    @Body('role') role: 'ADMIN' | 'PLAYER' | 'VIP',
  ) {
    const result = await this.adminService.updateUserRole(userId, role);
    await this.adminService.createAuditLog(
      admin.userId, 'USER_ROLE_CHANGE', 'USER', userId,
      { newRole: role },
    );
    return result;
  }

  @Post('users/:userId/vip')
  async grantVip(
    @CurrentUser() admin: { userId: string },
    @Param('userId') userId: string,
    @Body() body: { duration: string; customDays?: number },
  ) {
    return this.vipService.adminGrantVip(
      admin.userId,
      userId,
      body.duration as any,
      body.customDays,
    );
  }

  @Delete('users/:userId')
  async deleteUser(
    @CurrentUser() admin: { userId: string },
    @Param('userId') userId: string,
  ) {
    return this.adminService.deleteUser(admin.userId, userId);
  }

  @Patch('users/:userId/anonymize')
  async anonymizeUser(
    @CurrentUser() admin: { userId: string },
    @Param('userId') userId: string,
  ) {
    return this.adminService.anonymizeUser(admin.userId, userId);
  }

  @Patch('users/:userId/deanonymize')
  async deanonymizeUser(
    @CurrentUser() admin: { userId: string },
    @Param('userId') userId: string,
  ) {
    return this.adminService.deanonymizeUser(admin.userId, userId);
  }

  @Patch('users/:userId/reset-password')
  async resetPassword(
    @CurrentUser() admin: { userId: string },
    @Param('userId') userId: string,
  ) {
    return this.adminService.resetPassword(admin.userId, userId);
  }
}