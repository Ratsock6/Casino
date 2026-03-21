import { Module } from '@nestjs/common';
import { BetModule } from '../bet/bet.module';
import { IdempotencyModule } from '../idempotency/idempotency.module';
import { GameConfigModule } from '../game-config/game-config.module';
import { SlotsController } from './slots.controller';
import { SlotsService } from './slots.service';
import { CasinoConfigModule } from '../casino-config/casino-config.module';

@Module({
  imports: [BetModule, IdempotencyModule, GameConfigModule, CasinoConfigModule],
  controllers: [SlotsController],
  providers: [SlotsService],
})
export class SlotsModule {}