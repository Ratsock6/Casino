import { Module } from '@nestjs/common';
import { GameRoundsController } from './game-rounds.controller';
import { GameRoundsService } from './game-rounds.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GameRoundsController],
  providers: [GameRoundsService],
})
export class GameRoundsModule {}