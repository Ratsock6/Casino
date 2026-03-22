import { Module } from '@nestjs/common';
import { LevelsController } from './levels.controller';
import { LevelsService } from './levels.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WalletModule } from '../wallet/wallet.module';
import { VipModule } from '../vip/vip.module';

@Module({
  imports: [PrismaModule, WalletModule, VipModule],
  controllers: [LevelsController],
  providers: [LevelsService],
  exports: [LevelsService],
})
export class LevelsModule {}