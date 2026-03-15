export type SlotSymbol = 'CHERRY' | 'LEMON' | 'BAR' | 'SEVEN' | 'DIAMOND';

export interface SlotSymbolConfig {
  symbol: SlotSymbol;
  weight: number;
  payoutMultiplier: number;
}

export const SLOT_SYMBOLS: SlotSymbolConfig[] = [
  {
    symbol: 'CHERRY',
    weight: 30,
    payoutMultiplier: 2,
  },
  {
    symbol: 'LEMON',
    weight: 25,
    payoutMultiplier: 3,
  },
  {
    symbol: 'BAR',
    weight: 20,
    payoutMultiplier: 5,
  },
  {
    symbol: 'SEVEN',
    weight: 10,
    payoutMultiplier: 10,
  },
  {
    symbol: 'DIAMOND',
    weight: 5,
    payoutMultiplier: 20,
  },
];