import { Module } from '@nestjs/common';
import { BetController } from './bet.controller';
import { BetService } from './bet.service';

@Module({
  controllers: [BetController],
  providers: [BetService],
  exports: [BetService],
})
export class BetModule {}