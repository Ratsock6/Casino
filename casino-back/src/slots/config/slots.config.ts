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
// Poids x10 (mêmes proportions qu'avant : 35/28/22/12/6 → 350/280/220/120/60)
// pour permettre un réglage fin du RTP via un poids "blank".
export const SLOT_SYMBOLS: SlotSymbolConfig[] = [
  {
    symbol: 'CHERRY',
    weight: 350,
    payoutMultiplier: 9,
  },
  {
    symbol: 'LEMON',
    weight: 280,
    payoutMultiplier: 13,
  },
  {
    symbol: 'BAR',
    weight: 220,
    payoutMultiplier: 20,
  },
  {
    symbol: 'SEVEN',
    weight: 120,
    payoutMultiplier: 50,
  },
  {
    symbol: 'DIAMOND',
    weight: 60,
    payoutMultiplier: 110,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Modes de RTP (réglables depuis le panel admin via la clé CasinoConfig SLOTS_RTP_MODE)
// ─────────────────────────────────────────────────────────────────────────────
// On NE TOUCHE PAS aux multiplicateurs. On ajoute un poids "blank" (non-gagnant)
// au tirage de chaque rouleau, ce qui dilue la probabilité des combinaisons
// gagnantes et fait donc baisser le RTP — sans changer les gains affichés.
//
//   Poids symboles total = 1030.
//   blank = 0   → RTP 91.00 %  (mode '91')
//   blank = 24  → RTP 84.92 %  (mode '85')
//
// Quand un rouleau tire le "blank", le backend lui assigne un symbole qui CASSE
// la combinaison (non-gagnant garanti). Aucun nouveau symbole n'est exposé au front.
// ─────────────────────────────────────────────────────────────────────────────
export type SlotsRtpMode = '91' | '85';

export const SLOTS_BLANK_WEIGHT: Record<SlotsRtpMode, number> = {
  '91': 0,
  '85': 24,
};

export const DEFAULT_SLOTS_RTP_MODE: SlotsRtpMode = '91';