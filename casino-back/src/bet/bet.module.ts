import { Module } from '@nestjs/common';
import { BetController } from './bet.controller';
import { BetService } from './bet.service';
import { AlertsModule } from '../alerts/alerts.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, AlertsModule],
  controllers: [BetController],
  providers: [BetService],
  exports: [BetService],
})
export class BetModule { }