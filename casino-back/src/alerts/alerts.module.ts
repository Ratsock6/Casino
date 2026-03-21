import { Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CasinoConfigModule } from '../casino-config/casino-config.module';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [PrismaModule, CasinoConfigModule, GatewayModule],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}