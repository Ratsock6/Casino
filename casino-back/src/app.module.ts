import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WalletModule } from './wallet/wallet.module';
import { AdminModule } from './admin/admin.module';
import { BetModule } from './bet/bet.module';
import { SlotsModule } from './slots/slots.module';
import { IdempotencyModule } from './idempotency/idempotency.module';
import { RouletteModule } from './roulette/roulette.module';
import { GameConfigModule } from './game-config/game-config.module';
import { BlackjackModule } from './blackjack/blackjack.module';
import { GameRoundsModule } from './game-rounds/game-rounds.module';
import { PublicModule } from './public/public.module';
import { GatewayModule } from './gateway/gateway.module';
import { ReportsModule } from './reports/reports.module';
import { DiscordModule } from './discord/discord.module';
import { VipModule } from './vip/vip.module';
import { LevelsModule } from './levels/levels.module';
import { JackpotModule } from './jackpot/jackpot.module';
import { BattleBoxModule } from './battle-box/battle-box.module';
import { RewardCodesModule } from './reward-codes/reward-codes.module';



@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    WalletModule,
    AdminModule,
    BetModule,
    SlotsModule,
    IdempotencyModule,
    RouletteModule,
    GameConfigModule,
    BlackjackModule,
    GameRoundsModule,
    PublicModule,
    GatewayModule,
    ScheduleModule.forRoot(),
    ReportsModule,
    DiscordModule,
    VipModule,
    LevelsModule,
    JackpotModule,
    BattleBoxModule,
    RewardCodesModule,
  ],
})
export class AppModule {}