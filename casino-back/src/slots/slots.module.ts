import { Module } from '@nestjs/common';
import { BetModule } from '../bet/bet.module';
import { IdempotencyModule } from '../idempotency/idempotency.module';
import { SlotsController } from './slots.controller';
import { SlotsService } from './slots.service';

@Module({
  imports: [BetModule, IdempotencyModule],
  controllers: [SlotsController],
  providers: [SlotsService],
})
export class SlotsModule {}