import { Module } from '@nestjs/common';
import { BetController } from './bet.controller';
import { BetService } from './bet.service';
import { AlertsModule } from '../alerts/alerts.module';
import { PrismaModule } from '../prisma/prisma.module';
import { LevelsModule } from '../levels/levels.module';
import { JackpotModule } from '../jackpot/jackpot.module';
import { CasinoGateway } from 'src/gateway/casino.gateway';

@Module({
  imports: [PrismaModule, AlertsModule, LevelsModule, JackpotModule, CasinoGateway],
  controllers: [BetController],
  providers: [BetService],
  exports: [BetService],
})
export class BetModule {}