import { Module } from '@nestjs/common';
import { CasinoGateway } from './casino.gateway';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: (config.get<string>('JWT_ACCESS_EXPIRES') ?? '7d') as StringValue,
        },
      }),
    }),
  ],
  providers: [CasinoGateway],
  exports: [CasinoGateway],
})
export class GatewayModule {}