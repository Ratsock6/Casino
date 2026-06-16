import { Module } from '@nestjs/common';
import { IdempotencyModule } from '../idempotency/idempotency.module';
import { RaffleController } from './raffle.controller';
import { RaffleService } from './raffle.service';
import { RaffleAdminController } from './raffle-admin.controller';
import { RaffleAdminService } from './raffle-admin.service';

@Module({
  imports: [IdempotencyModule],
  controllers: [RaffleController, RaffleAdminController],
  providers: [RaffleService, RaffleAdminService],
  exports: [RaffleService, RaffleAdminService], // exportés pour le bot/admin
})
export class RaffleModule {}
