import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { MaintenanceController } from '../common/maintenance.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CasinoConfigModule } from '../casino-config/casino-config.module';

@Module({
  imports: [PrismaModule, CasinoConfigModule],
  controllers: [PublicController, MaintenanceController],
})
export class PublicModule { }
