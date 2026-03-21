import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CasinoConfigModule } from '../casino-config/casino-config.module';

@Module({
  imports: [PrismaModule, CasinoConfigModule],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}