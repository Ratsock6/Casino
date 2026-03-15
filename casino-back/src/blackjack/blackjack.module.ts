import { Module } from '@nestjs/common';
import { BetModule } from '../bet/bet.module';
import { IdempotencyModule } from '../idempotency/idempotency.module';
import { BlackjackController } from './blackjack.controller';
import { BlackjackService } from './blackjack.service';
import { GameConfigModule } from 'src/game-config/game-config.module';

@Module({
  imports: [BetModule, IdempotencyModule, GameConfigModule],
  controllers: [BlackjackController],
  providers: [BlackjackService],
})
export class BlackjackModule {}