import { Module } from '@nestjs/common';
import { DiscordController } from './discord.controller';
import { DiscordService } from './discord.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CasinoConfigModule } from '../casino-config/casino-config.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [PrismaModule, CasinoConfigModule, WalletModule],
  controllers: [DiscordController],
  providers: [DiscordService],
  exports: [DiscordService],
})
export class DiscordModule {}
