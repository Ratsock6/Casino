import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { WalletService } from '../wallet/wallet.service';
import { AdminWalletActionDto } from './dto/admin-wallet-action.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminController {
  constructor(private readonly walletService: WalletService) {}

  @Patch('wallet/credit')
  creditWallet(
    @CurrentUser() admin: { userId: string },
    @Body() dto: AdminWalletActionDto,
  ) {
    return this.walletService.adminCredit(
      admin.userId,
      dto.userId,
      dto.amount,
      dto.reason,
    );
  }

  @Patch('wallet/debit')
  debitWallet(
    @CurrentUser() admin: { userId: string },
    @Body() dto: AdminWalletActionDto,
  ) {
    return this.walletService.adminDebit(
      admin.userId,
      dto.userId,
      dto.amount,
      dto.reason,
    );
  }

  @Get('wallet/:userId')
  getWallet(@Param('userId') userId: string) {
    return this.walletService.getWalletByUserId(userId);
  }

  @Get('wallet/:userId/history')
  getWalletHistory(@Param('userId') userId: string) {
    return this.walletService.getWalletHistory(userId);
  }
}