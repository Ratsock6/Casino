import { Module } from '@nestjs/common';
import { RewardCodesController } from './reward-codes.controller';
import { RewardCodesService } from './reward-codes.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WalletModule } from '../wallet/wallet.module';
import { VipModule } from '../vip/vip.module';

@Module({
  imports: [PrismaModule, WalletModule, VipModule],
  controllers: [RewardCodesController],
  providers: [RewardCodesService],
  exports: [RewardCodesService],
})
export class RewardCodesModule {}