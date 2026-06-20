// ─────────────────────────────────────────────────────────────────────────────
//  REGISTRE DES MACHINES À SOUS (architecture scalable)
// ─────────────────────────────────────────────────────────────────────────────
//  Chaque machine est décrite par une config. Pour ajouter une nouvelle machine :
//    1. Définir ses symboles + sa mécanique (un fichier dans ./machines/)
//    2. L'enregistrer dans SLOT_MACHINES ci-dessous
//  Le moteur (slots.service) lit ce registre — aucune autre modification requise.
// ─────────────────────────────────────────────────────────────────────────────

// Les mécaniques supportées. Chaque mécanique a son évaluateur dédié.
export type SlotMechanic = 'CLASSIC_3' | 'CASCADE_3X3';

// Direction artistique (thème visuel, géré côté front via cet identifiant).
export type SlotTheme = 'CLASSIC' | 'GEMSTONE';

export interface SlotSymbolDef {
  // Identifiant interne du symbole (sert à l'évaluation)
  id: string;
  // Caractère/emoji affiché par défaut (le front peut surcharger via le thème)
  display: string;
  // Poids de tirage (probabilité relative)
  weight: number;
  // Multiplicateur de gain pour une combinaison de ce symbole
  payoutMultiplier: number;
}

export interface SlotMachineConfig {
  id: string;                // identifiant unique (ex: 'classic', 'gemstone')
  name: string;              // nom affiché (ex: 'Cerises Royales')
  description: string;       // courte description de la mécanique
  theme: SlotTheme;          // DA / thème visuel
  mechanic: SlotMechanic;    // mécanique de jeu
  symbols: SlotSymbolDef[];  // catalogue de symboles
  rtpPercent: number;        // RTP cible (informatif / affichage)
  // Réglage optionnel : poids "blank" par mode RTP (machine classique uniquement)
  blankWeightByMode?: Record<string, number>;
  // Mécanique cascade : multiplicateur appliqué selon le rang de la cascade
  cascadeMultipliers?: number[];
  // Symbole "wild" optionnel (remplace n'importe quel symbole)
  wildId?: string;
}

// ── MACHINE 1 : la machine classique existante (3 rouleaux, 3 identiques) ──────
// RTP 91% (togglable 85% via SLOTS_RTP_MODE). Poids x10 pour le réglage fin.
const CLASSIC_MACHINE: SlotMachineConfig = {
  id: 'classic',
  name: 'Cerises Royales',
  description: '3 rouleaux. Alignez 3 symboles identiques pour gagner.',
  theme: 'CLASSIC',
  mechanic: 'CLASSIC_3',
  rtpPercent: 91,
  blankWeightByMode: { '91': 0, '85': 24 },
  symbols: [
    { id: 'CHERRY', display: '🍒', weight: 350, payoutMultiplier: 9 },
    { id: 'LEMON', display: '🍋', weight: 280, payoutMultiplier: 13 },
    { id: 'BAR', display: '🅱️', weight: 220, payoutMultiplier: 20 },
    { id: 'SEVEN', display: '7️⃣', weight: 120, payoutMultiplier: 50 },
    { id: 'DIAMOND', display: '💎', weight: 60, payoutMultiplier: 110 },
  ],
};

// ── MACHINE 2 : Gemstone Cascade (grille 3x3, cascades) — RTP 95% ─────────────
// Calibrée par simulation (RTP mesuré ~95.4% sur 800k spins).
// Mécanique : grille 3x3, 5 lignes gagnantes (3 horizontales + 2 diagonales).
// Les symboles gagnants explosent, les autres tombent, de nouveaux apparaissent
// en haut ; chaque cascade applique un multiplicateur croissant.
// WILD (🌟) remplace n'importe quel symbole.
const GEMSTONE_MACHINE: SlotMachineConfig = {
  id: 'gemstone',
  name: 'Gemstone Cascade',
  description: 'Grille 3×3, 5 lignes gagnantes. Les gemmes explosent et cascadent pour des gains en chaîne, avec un multiplicateur qui grimpe à chaque cascade !',
  theme: 'GEMSTONE',
  mechanic: 'CASCADE_3X3',
  rtpPercent: 95,
  // Multiplicateur appliqué selon le rang de cascade (1er gain, 2e, 3e...).
  cascadeMultipliers: [1, 1, 2, 2, 3],
  wildId: 'WILD',
  symbols: [
    { id: 'RUBY', display: '❤️', weight: 30, payoutMultiplier: 2 },
    { id: 'TOPAZ', display: '🔶', weight: 26, payoutMultiplier: 3 },
    { id: 'SAPPHIRE', display: '🔷', weight: 22, payoutMultiplier: 4 },
    { id: 'EMERALD', display: '💚', weight: 16, payoutMultiplier: 6 },
    { id: 'AMETHYST', display: '💜', weight: 11, payoutMultiplier: 10 },
    { id: 'DIAMOND', display: '💎', weight: 7, payoutMultiplier: 16 },
    { id: 'CROWN', display: '👑', weight: 4, payoutMultiplier: 27 },
    { id: 'WILD', display: '🌟', weight: 2, payoutMultiplier: 40 },
  ],
};

// ── REGISTRE ──────────────────────────────────────────────────────────────────
export const SLOT_MACHINES: SlotMachineConfig[] = [
  CLASSIC_MACHINE,
  GEMSTONE_MACHINE,
];

export const DEFAULT_MACHINE_ID = 'classic';

export const getMachineById = (id: string): SlotMachineConfig | undefined =>
  SLOT_MACHINES.find((m) => m.id === id);

// Métadonnées publiques (pour l'écran de sélection front) — sans révéler les poids
// ni le RTP (information interne au casino).
export const getPublicMachineList = () =>
  SLOT_MACHINES.map((m) => ({
    id: m.id,
    name: m.name,
    description: m.description,
    theme: m.theme,
    mechanic: m.mechanic,
    symbols: m.symbols.map((s) => ({ id: s.id, display: s.display, payoutMultiplier: s.payoutMultiplier })),
  }));
