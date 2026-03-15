import { BadRequestException, Injectable } from '@nestjs/common';
import { UserRole } from '../generated/prisma/client';
import {
  CasinoGameKey,
  GAME_BET_LIMITS,
} from './game-limits.config';

@Injectable()
export class GameConfigService {
  getMaxBetForGame(game: CasinoGameKey, role: UserRole): number {
    const limits = GAME_BET_LIMITS[game];

    if (!limits) {
      throw new BadRequestException(`Missing bet limits for game: ${game}`);
    }

    if (role === UserRole.VIP) {
      return limits.vipMaxBet;
    }

    if (role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN) {
      return 1000_000;
    }

    return limits.standardMaxBet;
  }

  assertBetAmountAllowed(game: CasinoGameKey, role: UserRole, amount: number) {
    const maxBet = this.getMaxBetForGame(game, role);

    if (amount > maxBet) {
      throw new BadRequestException(
        `Maximum allowed bet for ${game} is ${maxBet} for role ${role}`,
      );
    }
  }
}