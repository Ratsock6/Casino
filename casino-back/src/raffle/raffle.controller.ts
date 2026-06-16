import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { RaffleService } from './raffle.service';
import { BuyTicketsDto } from './dto/buy-tickets.dto';

@Controller('raffle')
@UseGuards(JwtAuthGuard)
export class RaffleController {
  constructor(
    private readonly raffleService: RaffleService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  /// Campagne active + tirages + lots (public au sens "tout joueur connecté").
  @Get('current')
  async current() {
    return this.raffleService.getActiveCampaign();
  }

  /// Les tickets du joueur sur la campagne en cours.
  @Get('my-tickets')
  async myTickets(@CurrentUser() user: { userId: string }) {
    return this.raffleService.getMyTickets(user.userId);
  }

  /// Achat de tickets — idempotent (anti double-clic), comme les jeux.
  @Post('buy')
  async buy(
    @CurrentUser() user: { userId: string },
    @Body() dto: BuyTicketsDto,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('Missing x-idempotency-key header');
    }

    const requestHash = this.idempotencyService.buildRequestHash(dto);

    const { record, isNew } = await this.idempotencyService.begin(
      user.userId,
      'POST:/raffle/buy',
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
      const result = await this.raffleService.buyTickets(user.userId, dto.quantity);
      await this.idempotencyService.complete(idempotencyKey, result);
      return result;
    } catch (error) {
      await this.idempotencyService.fail(idempotencyKey);
      throw error;
    }
  }
}
