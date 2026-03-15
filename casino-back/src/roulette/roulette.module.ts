import { Module } from '@nestjs/common';
import { BetModule } from '../bet/bet.module';
import { IdempotencyModule } from '../idempotency/idempotency.module';
import { GameConfigModule } from '../game-config/game-config.module';
import { RouletteController } from './roulette.controller';
import { RouletteService } from './roulette.service';

@Module({
  imports: [BetModule, IdempotencyModule, GameConfigModule],
  controllers: [RouletteController],
  providers: [RouletteService],
})
export class RouletteModule {}