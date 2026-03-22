import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { WalletModule } from '../wallet/wallet.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CasinoConfigModule } from '../casino-config/casino-config.module';
import { ReportsModule } from '../reports/reports.module';
import { VipModule } from '../vip/vip.module';


@Module({
  imports: [WalletModule, PrismaModule, CasinoConfigModule, ReportsModule, VipModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}