import { Module } from '@nestjs/common';
import { JackpotController } from './jackpot.controller';
import { JackpotService } from './jackpot.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CasinoConfigModule } from '../casino-config/casino-config.module';

@Module({
  imports: [PrismaModule, CasinoConfigModule],
  controllers: [JackpotController],
  providers: [JackpotService],
  exports: [JackpotService],
})
export class JackpotModule {}