import { Module } from '@nestjs/common';
import { GameRoundsController } from './game-rounds.controller';
import { GameRoundsService } from './game-rounds.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CasinoConfigModule } from '../casino-config/casino-config.module';

@Module({
  imports: [PrismaModule, CasinoConfigModule],
  controllers: [GameRoundsController],
  providers: [GameRoundsService],
})
export class GameRoundsModule {}