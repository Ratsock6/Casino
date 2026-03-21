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
import { SpinSlotsDto } from './dto/spin-slots.dto';
import { SlotsService } from './slots.service';
import { MaintenanceGuard, Maintenance } from '../common/guards/maintenance.guard';

@Controller('slots')
@UseGuards(JwtAuthGuard, MaintenanceGuard)
export class SlotsController {
  constructor(
    private readonly slotsService: SlotsService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  @Post('spin')
  @Maintenance('MAINTENANCE_SLOTS')
  async spin(
    @CurrentUser() user: { userId: string; role: 'PLAYER' | 'VIP' | 'ADMIN' | 'SUPER_ADMIN' },
    @Body() dto: SpinSlotsDto,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('Missing x-idempotency-key header');
    }

    const requestHash = this.idempotencyService.buildRequestHash(dto);

    const { record, isNew } = await this.idempotencyService.begin(
      user.userId,
      'POST:/slots/spin',
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
      const result = await this.slotsService.spin(user.userId, user.role, dto.bet);
      await this.idempotencyService.complete(idempotencyKey, result);
      return result;
    } catch (error) {
      await this.idempotencyService.fail(idempotencyKey);
      throw error;
    }
  }
}