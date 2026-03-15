export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export type RouletteBetType =
  | 'STRAIGHT'
  | 'SPLIT'
  | 'STREET'
  | 'CORNER'
  | 'SIX_LINE'
  | 'RED'
  | 'BLACK'
  | 'EVEN'
  | 'ODD'
  | 'LOW'
  | 'HIGH'
  | 'DOZEN_1'
  | 'DOZEN_2'
  | 'DOZEN_3'
  | 'COLUMN_1'
  | 'COLUMN_2'
  | 'COLUMN_3';

export type RouletteColor = 'RED' | 'BLACK' | 'GREEN';

export interface ResolvedRouletteBet {
  type: RouletteBetType;
  amount: number;
  numbers?: number[];
  isWin: boolean;
  payout: number;
}

export interface ValidatedRouletteBet {
  type: RouletteBetType;
  amount: number;
  numbers?: number[];
  payoutMultiplier: number;
}