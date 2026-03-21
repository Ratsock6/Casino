import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CasinoConfigModule } from '../casino-config/casino-config.module';

@Module({
  imports: [PrismaModule, CasinoConfigModule],
  controllers: [PublicController],
})
export class PublicModule { }