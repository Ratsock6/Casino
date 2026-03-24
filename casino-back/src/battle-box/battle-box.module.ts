import { Module } from '@nestjs/common';
import { BattleBoxController } from './battle-box.controller';
import { BattleBoxService } from './battle-box.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CasinoConfigModule } from '../casino-config/casino-config.module';

@Module({
  imports: [PrismaModule, CasinoConfigModule],
  controllers: [BattleBoxController],
  providers: [BattleBoxService],
  exports: [BattleBoxService],
})
export class BattleBoxModule {}