import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [WalletModule],
  controllers: [AdminController],
})
export class AdminModule {}