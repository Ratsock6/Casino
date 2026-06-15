export type SlotSymbol = 'CHERRY' | 'LEMON' | 'BAR' | 'SEVEN' | 'DIAMOND';

export interface SlotSymbolConfig {
  symbol: SlotSymbol;
  weight: number;
  payoutMultiplier: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Calibrage RTP (Return To Player)
// ─────────────────────────────────────────────────────────────────────────────
// 3 rouleaux indépendants ; gain uniquement sur 3 symboles identiques.
// Poids total = 103. Proba(3 identiques) = (poids/103)^3.
// RTP = Σ proba(3 identiques) × payoutMultiplier.
//
// Configuration ci-dessous :
//   RTP slots ≈ 91,00 %  (house edge ≈ 9 %)
//   Hit rate  ≈ 7,08 %   (1 gain tous les ~14 spins)
//
// NB : ce RTP est celui de la mécanique slots SEULE. Le jackpot progressif
// (jackpot.service) et les récompenses de niveau (levels.service) ajoutent du
// retour par-dessus à chaque partie, donc le retour réel ressenti est un peu
// supérieur. C'est pourquoi on vise 91 % de base et non 95 %.
//
// ⚠️  Le front (SlotsPage.tsx → tableau RULES) réaffiche ces multiplicateurs
//     en dur : toute modification ici doit être répercutée côté front.
// ─────────────────────────────────────────────────────────────────────────────
export const SLOT_SYMBOLS: SlotSymbolConfig[] = [
  {
    symbol: 'CHERRY',
    weight: 35,
    payoutMultiplier: 9,    // contrib RTP : 35.3 % | 1 combo sur 25
  },
  {
    symbol: 'LEMON',
    weight: 28,
    payoutMultiplier: 13,   // contrib RTP : 26.1 % | 1 combo sur 50
  },
  {
    symbol: 'BAR',
    weight: 22,
    payoutMultiplier: 20,   // contrib RTP : 19.5 % | 1 combo sur 103
  },
  {
    symbol: 'SEVEN',
    weight: 12,
    payoutMultiplier: 50,   // contrib RTP : 7.9 % | 1 combo sur 632
  },
  {
    symbol: 'DIAMOND',
    weight: 6,
    payoutMultiplier: 110,  // contrib RTP : 2.2 % | 1 combo sur 5 059
  },
];