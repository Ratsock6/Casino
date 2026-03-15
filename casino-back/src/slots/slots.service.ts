import { Injectable } from '@nestjs/common';
import { BetService } from '../bet/bet.service';
import { GameType } from '../generated/prisma/client';
import { UserRole } from '../generated/prisma/client';
import { GameConfigService } from '../game-config/game-config.service';
import {
  SLOT_SYMBOLS,
  SlotSymbol,
  SlotSymbolConfig,
} from './config/slots.config';


@Injectable()
export class SlotsService {
  constructor(
    private readonly betService: BetService,
    private readonly gameConfigService: GameConfigService
  ) {}

  async spin(userId: string, role: UserRole, betAmount: number) {
    this.gameConfigService.assertBetAmountAllowed('SLOTS', role, betAmount);
    
    const placedBet = await this.betService.placeBet({
      userId,
      gameType: GameType.SLOTS,
      amount: betAmount,
      metadata: {
        mode: 'classic',
      },
    });

    const reels: SlotSymbol[] = [
      this.getWeightedRandomSymbol(),
      this.getWeightedRandomSymbol(),
      this.getWeightedRandomSymbol(),
    ];

    const winResult = this.evaluateSpin(reels, betAmount);

    if (winResult.isWin) {
      const settled = await this.betService.settleWin({
        roundId: placedBet.roundId,
        payout: winResult.payout,
        multiplier: winResult.multiplier,
        metadata: {
          reels,
          isWin: true,
          winningSymbol: winResult.winningSymbol,
          payoutMultiplier: winResult.multiplier,
        },
      });

      return {
        roundId: placedBet.roundId,
        gameType: GameType.SLOTS,
        bet: betAmount,
        reels,
        isWin: true,
        winningSymbol: winResult.winningSymbol,
        multiplier: winResult.multiplier,
        payout: winResult.payout,
        balanceBeforeBet: placedBet.balanceBefore,
        balanceAfterBet: placedBet.balanceAfter,
        balanceAfterSettlement: settled.balanceAfter,
      };
    }

    await this.betService.settleLoss({
      roundId: placedBet.roundId,
      metadata: {
        reels,
        isWin: false,
      },
    });

    return {
      roundId: placedBet.roundId,
      gameType: GameType.SLOTS,
      bet: betAmount,
      reels,
      isWin: false,
      winningSymbol: null,
      multiplier: 0,
      payout: 0,
      balanceBeforeBet: placedBet.balanceBefore,
      balanceAfterBet: placedBet.balanceAfter,
      balanceAfterSettlement: placedBet.balanceAfter,
    };
  }

  private getWeightedRandomSymbol(): SlotSymbol {
    const totalWeight = SLOT_SYMBOLS.reduce(
      (sum, symbolConfig) => sum + symbolConfig.weight,
      0,
    );

    let random = Math.floor(Math.random() * totalWeight);

    for (const symbolConfig of SLOT_SYMBOLS) {
      if (random < symbolConfig.weight) {
        return symbolConfig.symbol;
      }

      random -= symbolConfig.weight;
    }

    return SLOT_SYMBOLS[0].symbol;
  }

  private evaluateSpin(reels: SlotSymbol[], betAmount: number) {
    const [first, second, third] = reels;

    if (first === second && second === third) {
      const symbolConfig = this.getSymbolConfig(first);
      const multiplier = symbolConfig.payoutMultiplier;
      const payout = betAmount * multiplier;

      return {
        isWin: true,
        winningSymbol: first,
        multiplier,
        payout,
      };
    }

    return {
      isWin: false,
      winningSymbol: null,
      multiplier: 0,
      payout: 0,
    };
  }

  private getSymbolConfig(symbol: SlotSymbol): SlotSymbolConfig {
    const config = SLOT_SYMBOLS.find((entry) => entry.symbol === symbol);

    if (!config) {
      throw new Error(`Missing slot config for symbol: ${symbol}`);
    }

    return config;
  }
}