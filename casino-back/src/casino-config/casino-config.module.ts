import { Module } from '@nestjs/common';
import { CasinoConfigService } from './casino-config.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [CasinoConfigService],
  exports: [CasinoConfigService],
})
export class CasinoConfigModule {}