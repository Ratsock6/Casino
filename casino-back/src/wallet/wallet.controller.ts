import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WalletService } from './wallet.service';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('me')
  getMyWallet(@CurrentUser() user: { userId: string }) {
    return this.walletService.getWalletByUserId(user.userId);
  }

  @Get('me/history')
  getMyWalletHistory(
    @CurrentUser() user: { userId: string },
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;

    return this.walletService.getWalletHistory(user.userId, parsedLimit);
  }
}