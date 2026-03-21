import { Module } from '@nestjs/common';
import { BetModule } from '../bet/bet.module';
import { IdempotencyModule } from '../idempotency/idempotency.module';
import { GameConfigModule } from '../game-config/game-config.module';
import { RouletteController } from './roulette.controller';
import { RouletteService } from './roulette.service';
import { CasinoConfigModule } from '../casino-config/casino-config.module';

@Module({
  imports: [BetModule, IdempotencyModule, GameConfigModule, CasinoConfigModule],
  controllers: [RouletteController],
  providers: [RouletteService],
})
export class RouletteModule {}