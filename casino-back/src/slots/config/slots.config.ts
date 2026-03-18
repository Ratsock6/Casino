export type SlotSymbol = 'CHERRY' | 'LEMON' | 'BAR' | 'SEVEN' | 'DIAMOND';

export interface SlotSymbolConfig {
  symbol: SlotSymbol;
  weight: number;
  payoutMultiplier: number;
}

export const SLOT_SYMBOLS: SlotSymbolConfig[] = [
  {
    symbol: 'CHERRY',
    weight: 35,       // était 30
    payoutMultiplier: 2,
  },
  {
    symbol: 'LEMON',
    weight: 28,       // était 25
    payoutMultiplier: 3,
  },
  {
    symbol: 'BAR',
    weight: 22,       // était 20
    payoutMultiplier: 5,
  },
  {
    symbol: 'SEVEN',
    weight: 12,       // était 10
    payoutMultiplier: 10,
  },
  {
    symbol: 'DIAMOND',
    weight: 6,        // était 5
    payoutMultiplier: 20,
  },
];