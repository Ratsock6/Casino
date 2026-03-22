import { Module } from '@nestjs/common';
import { BetController } from './bet.controller';
import { BetService } from './bet.service';
import { AlertsModule } from '../alerts/alerts.module';
import { PrismaModule } from '../prisma/prisma.module';
import { LevelsModule } from '../levels/levels.module';


@Module({
  imports: [PrismaModule, AlertsModule, LevelsModule],
  controllers: [BetController],
  providers: [BetService],
  exports: [BetService],
})
export class BetModule { }