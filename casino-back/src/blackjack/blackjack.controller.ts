import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { BlackjackService } from './blackjack.service';
import { BlackjackActionDto } from './dto/blackjack-action.dto';
import { StartBlackjackDto } from './dto/start-blackjack.dto';

@Controller('blackjack')
@UseGuards(JwtAuthGuard)
export class BlackjackController {
  constructor(
    private readonly blackjackService: BlackjackService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  @Post('start')
  async start(
    @CurrentUser() user: { userId: string },
    @Body() dto: StartBlackjackDto,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('Missing x-idempotency-key header');
    }

    const requestHash = this.idempotencyService.buildRequestHash(dto);

    const { record, isNew } = await this.idempotencyService.begin(
      user.userId,
      'POST:/blackjack/start',
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
      const result = await this.blackjackService.startGame(user.userId, dto.bet);
      await this.idempotencyService.complete(idempotencyKey, result);
      return result;
    } catch (error) {
      await this.idempotencyService.fail(idempotencyKey);
      throw error;
    }
  }

  @Post('action')
  action(
    @CurrentUser() user: { userId: string },
    @Body() dto: BlackjackActionDto,
  ) {
    return this.blackjackService.playAction(user.userId, dto.gameId, dto.action);
  }

  @Get(':gameId')
  getGame(
    @CurrentUser() user: { userId: string },
    @Param('gameId') gameId: string,
  ) {
    return this.blackjackService.getGame(user.userId, gameId);
  }
}