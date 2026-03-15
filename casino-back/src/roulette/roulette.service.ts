import { BadRequestException, Injectable } from '@nestjs/common';
import { BetService } from '../bet/bet.service';
import { GameType, Prisma, UserRole } from '../generated/prisma/client';
import { GameConfigService } from '../game-config/game-config.service';
import {
  getRouletteColor,
  getRouletteColumn,
  getRouletteDozen,
  ROULETTE_PAYOUTS,
} from './config/roulette.config';
import { RouletteBetDto } from './dto/roulette-bet.dto';
import {
  JsonObject,
  ResolvedRouletteBet,
  ValidatedRouletteBet,
} from './types/roulette.types';

@Injectable()
export class RouletteService {
  constructor(
    private readonly betService: BetService,
    private readonly gameConfigService: GameConfigService,
  ) { }

  private getRow(number: number): number {
    return Math.ceil(number / 3);
  }

  private getColumn(number: number): number {
    const mod = number % 3;
    return mod === 0 ? 3 : mod;
  }

  private sortNumbers(numbers: number[]): number[] {
    return [...numbers].sort((a, b) => a - b);
  }

  private hasUniqueNumbers(numbers: number[]): boolean {
    return new Set(numbers).size === numbers.length;
  }

  private areAllNumbersBetween1And36(numbers: number[]): boolean {
    return numbers.every((n) => n >= 1 && n <= 36);
  }

  private isStraightValid(numbers: number[]): boolean {
    return numbers.length === 1 && numbers[0] >= 0 && numbers[0] <= 36;
  }

  private isSplitValid(numbers: number[]): boolean {
    if (numbers.length !== 2 || !this.hasUniqueNumbers(numbers)) {
      return false;
    }

    const sorted = this.sortNumbers(numbers);
    const [a, b] = sorted;

    // cas spéciaux avec 0 sur roulette européenne
    if (a === 0 && (b === 1 || b === 2 || b === 3)) {
      return true;
    }

    if (!this.areAllNumbersBetween1And36(sorted)) {
      return false;
    }

    // vertical voisin : +3
    if (b - a === 3) {
      return true;
    }

    // horizontal voisin : +1 mais même ligne
    if (b - a === 1 && this.getRow(a) === this.getRow(b)) {
      return true;
    }

    return false;
  }

  private isStreetValid(numbers: number[]): boolean {
    if (numbers.length !== 3 || !this.hasUniqueNumbers(numbers)) {
      return false;
    }

    const sorted = this.sortNumbers(numbers);
    const [a, b, c] = sorted;

    // cas spéciaux avec 0 sur roulette européenne
    if (
      (a === 0 && b === 1 && c === 2) ||
      (a === 0 && b === 2 && c === 3)
    ) {
      return true;
    }

    if (!this.areAllNumbersBetween1And36(sorted)) {
      return false;
    }

    return b === a + 1 && c === b + 1 && this.getRow(a) === this.getRow(c);
  }

  private isCornerValid(numbers: number[]): boolean {
    if (numbers.length !== 4 || !this.hasUniqueNumbers(numbers)) {
      return false;
    }

    if (!this.areAllNumbersBetween1And36(numbers)) {
      return false;
    }

    const sorted = this.sortNumbers(numbers);
    const [a, b, c, d] = sorted;

    // Forme attendue :
    // a   b
    // c   d
    // donc :
    // b = a + 1
    // c = a + 3
    // d = a + 4
    return (
      b === a + 1 &&
      c === a + 3 &&
      d === a + 4 &&
      this.getRow(a) === this.getRow(b) &&
      this.getRow(c) === this.getRow(d) &&
      this.getColumn(a) !== 3 // évite un faux carré en bord de ligne
    );
  }

  private isSixLineValid(numbers: number[]): boolean {
    if (numbers.length !== 6 || !this.hasUniqueNumbers(numbers)) {
      return false;
    }

    if (!this.areAllNumbersBetween1And36(numbers)) {
      return false;
    }

    const sorted = this.sortNumbers(numbers);
    const [a, b, c, d, e, f] = sorted;

    return (
      b === a + 1 &&
      c === a + 2 &&
      d === a + 3 &&
      e === a + 4 &&
      f === a + 5 &&
      this.getRow(a) === this.getRow(c) &&
      this.getRow(d) === this.getRow(f) &&
      this.getRow(d) === this.getRow(a) + 1
    );
  }

  private validatedBetToJson(bet: ValidatedRouletteBet): JsonObject {
    return {
      type: bet.type,
      amount: bet.amount,
      numbers: bet.numbers ?? null,
      payoutMultiplier: bet.payoutMultiplier,
    };
  }

  private resolvedBetToJson(bet: ResolvedRouletteBet): JsonObject {
    return {
      type: bet.type,
      amount: bet.amount,
      numbers: bet.numbers ?? null,
      isWin: bet.isWin,
      payout: bet.payout,
    };
  }

  async spin(userId: string, role: UserRole, bets: RouletteBetDto[]) {
    const validatedBets = bets.map((bet) => this.validateBet(bet));
    const validatedBetsJson = validatedBets.map((bet) => this.validatedBetToJson(bet));

    const totalBet = validatedBets.reduce((sum, bet) => sum + bet.amount, 0);

    this.gameConfigService.assertBetAmountAllowed('ROULETTE', role, totalBet);

    const placedBet = await this.betService.placeBet({
      userId,
      gameType: GameType.ROULETTE,
      amount: totalBet,
      metadata: {
        bets: validatedBetsJson,
      },
    });

    const winningNumber = this.spinWheel();
    const winningColor = getRouletteColor(winningNumber);

    const resolvedBets = validatedBets.map((bet) =>
      this.resolveBet(bet, winningNumber),
    );
    const resolvedBetsJson = resolvedBets.map((bet) => this.resolvedBetToJson(bet));
    const totalPayout = resolvedBets.reduce((sum, bet) => sum + bet.payout, 0);

    this.gameConfigService.assertBetAmountAllowed('ROULETTE', role, totalBet);

    if (totalPayout > 0) {

      const settled = await this.betService.settleWin({
        roundId: placedBet.roundId,
        payout: totalPayout,
        metadata: {
          winningNumber,
          winningColor,
          bets: resolvedBetsJson,
        },
      });

      return {
        roundId: placedBet.roundId,
        gameType: GameType.ROULETTE,
        winningNumber,
        winningColor,
        bets: resolvedBets,
        totalBet,
        totalPayout,
        balanceBeforeBet: placedBet.balanceBefore,
        balanceAfterBet: placedBet.balanceAfter,
        balanceAfterSettlement: settled.balanceAfter,
      };
    }

    await this.betService.settleLoss({
      roundId: placedBet.roundId,
      metadata: {
        winningNumber,
        winningColor,
        bets: resolvedBetsJson,
      },
    });

    return {
      roundId: placedBet.roundId,
      gameType: GameType.ROULETTE,
      winningNumber,
      winningColor,
      bets: resolvedBets,
      totalBet,
      totalPayout: 0,
      balanceBeforeBet: placedBet.balanceBefore,
      balanceAfterBet: placedBet.balanceAfter,
      balanceAfterSettlement: placedBet.balanceAfter,
    };
  }

  private spinWheel(): number {
    return Math.floor(Math.random() * 37);
  }

  private validateBet(bet: RouletteBetDto): ValidatedRouletteBet {
    const payoutMultiplier = ROULETTE_PAYOUTS[bet.type];

    if (!payoutMultiplier) {
      throw new BadRequestException(`Unsupported bet type: ${bet.type}`);
    }

    switch (bet.type) {
      case 'STRAIGHT':
        this.assertNumbersCount(bet, 1);
        if (!this.isStraightValid(bet.numbers!)) {
          throw new BadRequestException('Invalid STRAIGHT bet');
        }
        break;

      case 'SPLIT':
        this.assertNumbersCount(bet, 2);
        if (!this.isSplitValid(bet.numbers!)) {
          throw new BadRequestException('Invalid SPLIT bet');
        }
        break;

      case 'STREET':
        this.assertNumbersCount(bet, 3);
        if (!this.isStreetValid(bet.numbers!)) {
          throw new BadRequestException('Invalid STREET bet');
        }
        break;

      case 'CORNER':
        this.assertNumbersCount(bet, 4);
        if (!this.isCornerValid(bet.numbers!)) {
          throw new BadRequestException('Invalid CORNER bet');
        }
        break;

      case 'SIX_LINE':
        this.assertNumbersCount(bet, 6);
        if (!this.isSixLineValid(bet.numbers!)) {
          throw new BadRequestException('Invalid SIX_LINE bet');
        }
        break;

      default:
        if (bet.numbers && bet.numbers.length > 0) {
          throw new BadRequestException(
            `${bet.type} should not contain numbers`,
          );
        }
    }

    return {
      type: bet.type,
      amount: bet.amount,
      numbers: bet.numbers,
      payoutMultiplier,
    };
  }

  private assertNumbersCount(bet: RouletteBetDto, expected: number) {
    if (!bet.numbers || bet.numbers.length !== expected) {
      throw new BadRequestException(
        `${bet.type} requires exactly ${expected} number(s)`,
      );
    }
  }

  private resolveBet(
    bet: ValidatedRouletteBet,
    winningNumber: number,
  ): ResolvedRouletteBet {
    const isWin = this.isWinningBet(bet, winningNumber);
    const payout = isWin ? bet.amount * bet.payoutMultiplier : 0;

    return {
      type: bet.type,
      amount: bet.amount,
      numbers: bet.numbers,
      isWin,
      payout,
    };
  }

  private isWinningBet(bet: ValidatedRouletteBet, winningNumber: number): boolean {
    switch (bet.type) {
      case 'STRAIGHT':
      case 'SPLIT':
      case 'STREET':
      case 'CORNER':
      case 'SIX_LINE':
        return bet.numbers?.includes(winningNumber) ?? false;

      case 'RED':
        return winningNumber !== 0 && getRouletteColor(winningNumber) === 'RED';

      case 'BLACK':
        return winningNumber !== 0 && getRouletteColor(winningNumber) === 'BLACK';

      case 'EVEN':
        return winningNumber !== 0 && winningNumber % 2 === 0;

      case 'ODD':
        return winningNumber !== 0 && winningNumber % 2 === 1;

      case 'LOW':
        return winningNumber >= 1 && winningNumber <= 18;

      case 'HIGH':
        return winningNumber >= 19 && winningNumber <= 36;

      case 'DOZEN_1':
        return getRouletteDozen(winningNumber) === 1;

      case 'DOZEN_2':
        return getRouletteDozen(winningNumber) === 2;

      case 'DOZEN_3':
        return getRouletteDozen(winningNumber) === 3;

      case 'COLUMN_1':
        return getRouletteColumn(winningNumber) === 1;

      case 'COLUMN_2':
        return getRouletteColumn(winningNumber) === 2;

      case 'COLUMN_3':
        return getRouletteColumn(winningNumber) === 3;

      default:
        return false;
    }
  }
}