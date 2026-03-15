import { Module } from '@nestjs/common';
import { BetModule } from '../bet/bet.module';
import { SlotsController } from './slots.controller';
import { SlotsService } from './slots.service';

@Module({
  imports: [BetModule],
  controllers: [SlotsController],
  providers: [SlotsService],
})
export class SlotsModule {}