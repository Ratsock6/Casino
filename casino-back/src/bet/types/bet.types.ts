import { GameType } from '../../generated/prisma/client';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export interface PlaceBetInput {
  userId: string;
  gameType: GameType;
  amount: number;
  metadata?: JsonObject;
}

export interface SettleWinInput {
  roundId: string;
  payout: number;
  multiplier?: number;
  metadata?: JsonObject;
}

export interface SettleLossInput {
  roundId: string;
  metadata?: JsonObject;
}

export interface RefundBetInput {
  roundId: string;
  reason?: string;
  metadata?: JsonObject;
}