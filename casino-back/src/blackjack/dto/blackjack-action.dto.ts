import { IsIn, IsString } from 'class-validator';
import type { BlackjackActionType } from '../types/blackjack.types';

const BLACKJACK_ACTIONS: BlackjackActionType[] = ['HIT', 'STAND'];

export class BlackjackActionDto {
  @IsString()
  gameId: string;

  @IsString()
  @IsIn(BLACKJACK_ACTIONS)
  action: BlackjackActionType;
}