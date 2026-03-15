export type CasinoGameKey = 'ROULETTE' | 'SLOTS';

export interface GameBetLimitConfig {
  standardMaxBet: number;
  vipMaxBet: number;
}

export const GAME_BET_LIMITS: Record<CasinoGameKey, GameBetLimitConfig> = {
  ROULETTE: {
    standardMaxBet: 10_000,
    vipMaxBet: 50_000,
  },
  SLOTS: {
    standardMaxBet: 20_000,
    vipMaxBet: 100_000,
  },
};