// ─── Configuration des box ────────────────────────────────────────────────────
// Pour ajouter une nouvelle box : ajouter une entrée dans BOX_CATALOG et BOX_ITEMS

export type BoxType = 'STANDARD' | 'PREMIUM' | 'ELITE' | 'VIP';

export interface BoxConfig {
  price: number;
  rtp: number;
  label: string;
  emoji: string;
  vipOnly: boolean;
  description: string;
}

export interface BoxItem {
  name: string;
  value: number;
  weight: number;
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  emoji: string;
}

export const BOX_CATALOG: Record<BoxType, BoxConfig> = {
  STANDARD: {
    price: 10000,
    rtp: 0.90,
    label: 'Box Standard',
    emoji: '📦',
    vipOnly: false,
    description: 'Une box classique avec des objets variés.',
  },
  PREMIUM: {
    price: 25000,
    rtp: 0.90,
    label: 'Box Premium',
    emoji: '🎁',
    vipOnly: false,
    description: 'Une box de qualité supérieure.',
  },
  ELITE: {
    price: 50000,
    rtp: 0.90,
    label: 'Box Elite',
    emoji: '💎',
    vipOnly: false,
    description: 'La box la plus prestigieuse.',
  },
  VIP: {
    price: 15000,
    rtp: 0.92,
    label: 'Box VIP',
    emoji: '👑',
    vipOnly: true,
    description: 'Réservée aux membres VIP. RTP amélioré.',
  },
};

// ─── Objets par box ───────────────────────────────────────────────────────────
// Les weights sont relatifs — plus le weight est élevé, plus l'objet est fréquent
// Pour ajouter un objet : ajouter une entrée dans le tableau correspondant

export const BOX_ITEMS: Record<BoxType, BoxItem[]> = {
  STANDARD: [
    { name: 'Montre classique',       value: 5000,  weight: 30, rarity: 'COMMON',    emoji: '⌚' },
    { name: 'Costume élégant',        value: 7000,  weight: 25, rarity: 'COMMON',    emoji: '👔' },
    { name: 'Bouteille de whisky',    value: 8000,  weight: 20, rarity: 'UNCOMMON',  emoji: '🥃' },
    { name: 'Attaché-case en cuir',   value: 10000, weight: 12, rarity: 'UNCOMMON',  emoji: '💼' },
    { name: 'Pistolet de collection', value: 14000, weight: 8,  rarity: 'RARE',      emoji: '🔫' },
    { name: 'Bague en or',            value: 18000, weight: 4,  rarity: 'EPIC',      emoji: '💍' },
    { name: 'Tableau de maître',      value: 35000, weight: 1,  rarity: 'LEGENDARY', emoji: '🖼️' },
  ],
  PREMIUM: [
    { name: 'Montre de luxe',         value: 12000, weight: 30, rarity: 'COMMON',    emoji: '⌚' },
    { name: 'Costume sur mesure',     value: 18000, weight: 25, rarity: 'COMMON',    emoji: '🎩' },
    { name: 'Champagne millésimé',    value: 20000, weight: 18, rarity: 'UNCOMMON',  emoji: '🍾' },
    { name: 'Moto personnalisée',     value: 28000, weight: 12, rarity: 'UNCOMMON',  emoji: '🏍️' },
    { name: 'Fusil de chasse',        value: 35000, weight: 8,  rarity: 'RARE',      emoji: '🔫' },
    { name: 'Collier de diamants',    value: 45000, weight: 5,  rarity: 'EPIC',      emoji: '💎' },
    { name: 'Voiture de sport',       value: 90000, weight: 2,  rarity: 'LEGENDARY', emoji: '🏎️' },
  ],
  ELITE: [
    { name: 'Rolex Daytona',          value: 30000, weight: 28, rarity: 'COMMON',    emoji: '⌚' },
    { name: 'Costume Brioni',         value: 40000, weight: 22, rarity: 'COMMON',    emoji: '🎩' },
    { name: 'Cave à vin privée',      value: 50000, weight: 16, rarity: 'UNCOMMON',  emoji: '🍷' },
    { name: 'Appartement downtown',   value: 65000, weight: 14, rarity: 'UNCOMMON',  emoji: '🏠' },
    { name: 'Jet privé (place)',      value: 80000, weight: 10, rarity: 'RARE',      emoji: '✈️' },
    { name: 'Yacht privé',            value: 120000,weight: 6,  rarity: 'EPIC',      emoji: '⛵' },
    { name: 'Villa en bord de mer',   value: 200000,weight: 4,  rarity: 'LEGENDARY', emoji: '🏖️' },
  ],
  VIP: [
    { name: 'Montre Patek Philippe',  value: 18000, weight: 28, rarity: 'COMMON',    emoji: '⌚' },
    { name: 'Tenue exclusive casino', value: 22000, weight: 24, rarity: 'COMMON',    emoji: '🥂' },
    { name: 'Voiture de luxe',        value: 30000, weight: 18, rarity: 'UNCOMMON',  emoji: '🚗' },
    { name: 'Penthouse view',         value: 45000, weight: 14, rarity: 'UNCOMMON',  emoji: '🏙️' },
    { name: 'Supercar exclusive',     value: 65000, weight: 10, rarity: 'RARE',      emoji: '🏎️' },
    { name: 'Île privée (séjour)',    value: 90000, weight: 5,  rarity: 'EPIC',      emoji: '🏝️' },
    { name: 'Manoir privé',          value: 180000,weight: 1,  rarity: 'LEGENDARY', emoji: '🏰' },
  ],
};

// ─── Utilitaire de tirage ─────────────────────────────────────────────────────
export const drawItem = (boxType: BoxType): BoxItem => {
  const items = BOX_ITEMS[boxType];
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;

  for (const item of items) {
    random -= item.weight;
    if (random <= 0) return item;
  }

  return items[items.length - 1];
};

// ─── Calcul de la mise totale ─────────────────────────────────────────────────
export const calculateStake = (boxSelection: Record<string, number>): number => {
  return Object.entries(boxSelection).reduce((total, [boxType, count]) => {
    const box = BOX_CATALOG[boxType as BoxType];
    return total + (box ? box.price * count : 0);
  }, 0);
};