import { RouletteBetType, RouletteColor } from '../types/roulette.types';

export const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9,
  12, 14, 16, 18,
  19, 21, 23, 25, 27,
  30, 32, 34, 36,
]);

export const BLACK_NUMBERS = new Set([
  2, 4, 6, 8, 10,
  11, 13, 15, 17,
  20, 22, 24, 26, 28,
  29, 31, 33, 35,
]);

export const ROULETTE_PAYOUTS: Record<RouletteBetType, number> = {
  STRAIGHT: 36,
  SPLIT: 18,
  STREET: 12,
  CORNER: 9,
  SIX_LINE: 6,
  RED: 2,
  BLACK: 2,
  EVEN: 2,
  ODD: 2,
  LOW: 2,
  HIGH: 2,
  DOZEN_1: 3,
  DOZEN_2: 3,
  DOZEN_3: 3,
  COLUMN_1: 3,
  COLUMN_2: 3,
  COLUMN_3: 3,
};

export function getRouletteColor(number: number): RouletteColor {
  if (number === 0) {
    return 'GREEN';
  }

  if (RED_NUMBERS.has(number)) {
    return 'RED';
  }

  return 'BLACK';
}

export function getRouletteColumn(number: number): 1 | 2 | 3 | null {
  if (number === 0) {
    return null;
  }

  const mod = number % 3;

  if (mod === 1) {
    return 1;
  }

  if (mod === 2) {
    return 2;
  }

  return 3;
}

export function getRouletteDozen(number: number): 1 | 2 | 3 | null {
  if (number >= 1 && number <= 12) {
    return 1;
  }

  if (number >= 13 && number <= 24) {
    return 2;
  }

  if (number >= 25 && number <= 36) {
    return 3;
  }

  return null;
}