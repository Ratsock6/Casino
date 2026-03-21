import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { PlaceRouletteBetsDto } from './dto/place-roulette-bets.dto';
import { RouletteService } from './roulette.service';
import { MaintenanceGuard, Maintenance } from '../common/guards/maintenance.guard';

@Controller('roulette')
@UseGuards(JwtAuthGuard, MaintenanceGuard)
export class RouletteController {
  constructor(
    private readonly rouletteService: RouletteService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  @Post('spin')
  @Maintenance('MAINTENANCE_ROULETTE')
  async spin(
    @CurrentUser() user: { userId: string; role: 'PLAYER' | 'VIP' | 'ADMIN' | 'SUPER_ADMIN' },
    @Body() dto: PlaceRouletteBetsDto,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('Missing x-idempotency-key header');
    }

    const requestHash = this.idempotencyService.buildRequestHash(dto);

    const { record, isNew } = await this.idempotencyService.begin(
      user.userId,
      'POST:/roulette/spin',
      idempotencyKey,
      requestHash,
    );

    if (!isNew && record.status === 'COMPLETED' && record.responseBody) {
      return record.responseBody;
    }

    if (!isNew && record.status === 'PROCESSING') {
      throw new BadRequestException('This request is already being processed');
    }

    try {
      const result = await this.rouletteService.spin(user.userId, user.role, dto.bets);
      await this.idempotencyService.complete(idempotencyKey, result);
      return result;
    } catch (error) {
      await this.idempotencyService.fail(idempotencyKey);
      throw error;
    }
  }
}