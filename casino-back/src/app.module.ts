import { Module } from '@nestjs/common';
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
  ],
})
export class AppModule {}