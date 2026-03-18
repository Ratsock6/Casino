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

export interface RouletteBet {
  type: RouletteBetType;
  numbers?: number[];
  amount: number;
}

export interface RouletteSpinResponse {
  roundId: string;
  gameType: string;
  winningNumber: number;
  winningColor: 'RED' | 'BLACK' | 'GREEN';
  bets: {
    type: string;
    amount: number;
    isWin: boolean;
    payout: number;
  }[];
  totalBet: number;
  totalPayout: number;
  balanceBeforeBet: string;
  balanceAfterBet: string;
  balanceAfterSettlement: string;
}