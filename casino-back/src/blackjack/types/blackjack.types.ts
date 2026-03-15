export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export type CardSuit = 'HEARTS' | 'DIAMONDS' | 'CLUBS' | 'SPADES' | 'HIDDEN';

export type CardRank =
  | 'A'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K'
  | 'HIDDEN';

export interface BlackjackCard {
  rank: CardRank;
  suit: CardSuit;
}

export type BlackjackActionType = 'HIT' | 'STAND';