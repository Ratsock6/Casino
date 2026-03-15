import { Module } from '@nestjs/common';
import { BetModule } from '../bet/bet.module';
import { IdempotencyModule } from '../idempotency/idempotency.module';
import { BlackjackController } from './blackjack.controller';
import { BlackjackService } from './blackjack.service';

@Module({
  imports: [BetModule, IdempotencyModule],
  controllers: [BlackjackController],
  providers: [BlackjackService],
})
export class BlackjackModule {}