import { Global, Module } from '@nestjs/common';
import { CasinoGateway } from './casino.gateway';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: (config.get<string>('JWT_ACCESS_EXPIRES') ?? '7d') as StringValue,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [CasinoGateway],
  exports: [CasinoGateway, JwtModule],
})
export class GatewayModule {}