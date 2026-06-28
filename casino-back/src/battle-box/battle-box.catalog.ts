// ─── Configuration des box ────────────────────────────────────────────────────
// Pour ajouter une nouvelle box : ajouter une entrée dans BOX_CATALOG et BOX_ITEMS

export type BoxType =
  | 'STANDARD' | 'PREMIUM' | 'ELITE' | 'VIP'
  | 'QUARTIER' | 'FETE' | 'TROPICALE' | 'CASSE' | 'VEGAS'
  | 'COLLECTIONNEUR' | 'PARRAIN' | 'DIAMANT_NOIR' | 'PRESIDENTIELLE' | 'COFFRE_ROYAL'
  | 'LOS_SANTOS' | 'GROVE_STREET' | 'VINEWOOD' | 'BRAQUAGE_PACIFIC' | 'IMPORT_EXPORT'
  | 'CARTEL' | 'COURSE_ILLEGALE' | 'MAZE_BANK' | 'CASINO_DIAMOND' | 'MONT_CHILIAD';

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
  QUARTIER: {
    price: 5000,
    rtp: 0.7,
    label: 'Box du Quartier',
    emoji: '🔫',
    vipOnly: false,
    description: 'Risquée : faible retour moyen mais gros lot rare. Pour les casse-cou !',
  },
  FETE: {
    price: 8000,
    rtp: 0.84,
    label: 'Box de la Fête',
    emoji: '🎉',
    vipOnly: false,
    description: 'Ambiance soirée : objets fun et festifs.',
  },
  TROPICALE: {
    price: 12000,
    rtp: 0.85,
    label: 'Box Tropicale',
    emoji: '🏝️',
    vipOnly: false,
    description: 'Évasion et soleil dans chaque tirage.',
  },
  CASSE: {
    price: 20000,
    rtp: 0.86,
    label: 'Box du Casse',
    emoji: '💰',
    vipOnly: false,
    description: 'Le butin d\'un braquage réussi.',
  },
  VEGAS: {
    price: 35000,
    rtp: 0.88,
    label: 'Box Vegas',
    emoji: '🎰',
    vipOnly: false,
    description: 'Le grand frisson de Las Vegas.',
  },
  COLLECTIONNEUR: {
    price: 45000,
    rtp: 0.9,
    label: 'Box du Collectionneur',
    emoji: '🏆',
    vipOnly: false,
    description: 'Pièces rares pour les connaisseurs.',
  },
  PARRAIN: {
    price: 60000,
    rtp: 0.89,
    label: 'Box du Parrain',
    emoji: '🤵',
    vipOnly: false,
    description: 'Le luxe de la pègre. Respect garanti.',
  },
  DIAMANT_NOIR: {
    price: 30000,
    rtp: 0.93,
    label: 'Box Diamant Noir',
    emoji: '💠',
    vipOnly: true,
    description: 'VIP : RTP premium, objets d\'exception.',
  },
  PRESIDENTIELLE: {
    price: 100000,
    rtp: 0.94,
    label: 'Box Présidentielle',
    emoji: '🎖️',
    vipOnly: true,
    description: 'VIP : le summum du prestige absolu.',
  },
  COFFRE_ROYAL: {
    price: 75000,
    rtp: 0.96,
    label: 'Box du Coffre Royal',
    emoji: '👑',
    vipOnly: true,
    description: 'VIP : RTP extrême, presque tout revient. Le Graal !',
  },
  LOS_SANTOS: {
    price: 7000,
    rtp: 0.82,
    label: 'Box Los Santos',
    emoji: '🌴',
    vipOnly: false,
    description: 'La ville de tous les possibles.',
  },
  GROVE_STREET: {
    price: 6000,
    rtp: 0.78,
    label: 'Box Grove Street',
    emoji: '🟢',
    vipOnly: false,
    description: 'Représente ton hood. Loyauté avant tout.',
  },
  VINEWOOD: {
    price: 40000,
    rtp: 0.89,
    label: 'Box Vinewood',
    emoji: '⭐',
    vipOnly: false,
    description: 'Paillettes et gloire des collines.',
  },
  BRAQUAGE_PACIFIC: {
    price: 80000,
    rtp: 0.91,
    label: 'Box Braquage Pacific',
    emoji: '🏦',
    vipOnly: false,
    description: 'Le plus gros casse de la ville.',
  },
  IMPORT_EXPORT: {
    price: 25000,
    rtp: 0.87,
    label: 'Box Import/Export',
    emoji: '🚛',
    vipOnly: false,
    description: 'Le business des véhicules de luxe.',
  },
  CARTEL: {
    price: 50000,
    rtp: 0.85,
    label: 'Box Cartel',
    emoji: '💊',
    vipOnly: false,
    description: 'L\'empire du trafic. Risqué mais lucratif.',
  },
  COURSE_ILLEGALE: {
    price: 15000,
    rtp: 0.83,
    label: 'Box Course Illégale',
    emoji: '🏁',
    vipOnly: false,
    description: 'Vitesse, nitro et paris clandestins.',
  },
  MAZE_BANK: {
    price: 100000,
    rtp: 0.94,
    label: 'Box Maze Bank',
    emoji: '🏙️',
    vipOnly: true,
    description: 'VIP : la fortune des élites de Los Santos.',
  },
  CASINO_DIAMOND: {
    price: 60000,
    rtp: 0.93,
    label: 'Box Casino Diamond',
    emoji: '🎰',
    vipOnly: true,
    description: 'VIP : le luxe du Diamond Casino & Resort.',
  },
  MONT_CHILIAD: {
    price: 9000,
    rtp: 0.72,
    label: 'Box Mont Chiliad',
    emoji: '🏔️',
    vipOnly: false,
    description: 'Risquée : le mystère de la montagne. Gros ou rien !',
  },
};

// ─── Objets par box ───────────────────────────────────────────────────────────
// Les weights sont relatifs — plus le weight est élevé, plus l'objet est fréquent
// Pour ajouter un objet : ajouter une entrée dans le tableau correspondant

export const BOX_ITEMS: Record<BoxType, BoxItem[]> = {
  STANDARD: [
    { name: 'Montre classique', value: 5000, weight: 30, rarity: 'COMMON', emoji: '⌚' },
    { name: 'Costume élégant', value: 7000, weight: 25, rarity: 'COMMON', emoji: '👔' },
    { name: 'Bouteille de whisky', value: 8000, weight: 20, rarity: 'UNCOMMON', emoji: '🥃' },
    { name: 'Attaché-case en cuir', value: 10000, weight: 12, rarity: 'UNCOMMON', emoji: '💼' },
    { name: 'Pistolet de collection', value: 14000, weight: 8, rarity: 'RARE', emoji: '🔫' },
    { name: 'Bague en or', value: 18000, weight: 4, rarity: 'EPIC', emoji: '💍' },
    { name: 'Tableau de maître', value: 35000, weight: 1, rarity: 'LEGENDARY', emoji: '🖼️' },
  ],
  PREMIUM: [
    { name: 'Montre de luxe', value: 12000, weight: 30, rarity: 'COMMON', emoji: '⌚' },
    { name: 'Costume sur mesure', value: 18000, weight: 25, rarity: 'COMMON', emoji: '🎩' },
    { name: 'Champagne millésimé', value: 20000, weight: 18, rarity: 'UNCOMMON', emoji: '🍾' },
    { name: 'Moto personnalisée', value: 28000, weight: 12, rarity: 'UNCOMMON', emoji: '🏍️' },
    { name: 'Fusil de chasse', value: 35000, weight: 8, rarity: 'RARE', emoji: '🔫' },
    { name: 'Collier de diamants', value: 45000, weight: 5, rarity: 'EPIC', emoji: '💎' },
    { name: 'Voiture de sport', value: 90000, weight: 2, rarity: 'LEGENDARY', emoji: '🏎️' },
  ],
  ELITE: [
    { name: 'Rolex Daytona', value: 25000, weight: 28, rarity: 'COMMON', emoji: '⌚' },
    { name: 'Costume Brioni', value: 32000, weight: 22, rarity: 'COMMON', emoji: '🎩' },
    { name: 'Cave à vin privée', value: 40000, weight: 16, rarity: 'UNCOMMON', emoji: '🍷' },
    { name: 'Appartement downtown', value: 55000, weight: 14, rarity: 'UNCOMMON', emoji: '🏠' },
    { name: 'Jet privé (place)', value: 65000, weight: 10, rarity: 'RARE', emoji: '✈️' },
    { name: 'Yacht privé', value: 85000, weight: 6, rarity: 'EPIC', emoji: '⛵' },
    { name: 'Villa en bord de mer', value: 130000, weight: 4, rarity: 'LEGENDARY', emoji: '🏖️' },
  ],
  VIP: [
    { name: 'Montre Patek Philippe', value: 7000, weight: 28, rarity: 'COMMON', emoji: '⌚' },
    { name: 'Tenue exclusive casino', value: 9000, weight: 24, rarity: 'COMMON', emoji: '🥂' },
    { name: 'Voiture de luxe', value: 12000, weight: 18, rarity: 'UNCOMMON', emoji: '🚗' },
    { name: 'Penthouse view', value: 17000, weight: 14, rarity: 'UNCOMMON', emoji: '🏙️' },
    { name: 'Supercar exclusive', value: 25000, weight: 10, rarity: 'RARE', emoji: '🏎️' },
    { name: 'Île privée (séjour)', value: 35000, weight: 5, rarity: 'EPIC', emoji: '🏝️' },
    { name: 'Manoir privé', value: 80000, weight: 1, rarity: 'LEGENDARY', emoji: '🏰' },
  ],
  QUARTIER: [
    { name: 'Chaîne en plaqué', value: 1000, weight: 30, rarity: 'COMMON', emoji: '⛓️' },
    { name: 'Casquette de marque', value: 1600, weight: 25, rarity: 'COMMON', emoji: '🧢' },
    { name: 'Liasse de billets', value: 2400, weight: 18, rarity: 'UNCOMMON', emoji: '💵' },
    { name: 'Couteau papillon', value: 3600, weight: 12, rarity: 'UNCOMMON', emoji: '🔪' },
    { name: 'Pistolet de rue', value: 6400, weight: 8, rarity: 'RARE', emoji: '🔫' },
    { name: 'Scooter trafiqué', value: 14000, weight: 5, rarity: 'EPIC', emoji: '🛵' },
    { name: 'Magot du quartier', value: 36000, weight: 2, rarity: 'LEGENDARY', emoji: '💰' },
  ],
  FETE: [
    { name: 'Pack de bières', value: 3400, weight: 30, rarity: 'COMMON', emoji: '🍺' },
    { name: 'Enceinte portable', value: 4800, weight: 25, rarity: 'COMMON', emoji: '🔊' },
    { name: 'Bouteille de vodka', value: 6300, weight: 18, rarity: 'UNCOMMON', emoji: '🍸' },
    { name: 'Platine DJ', value: 8200, weight: 12, rarity: 'UNCOMMON', emoji: '🎧' },
    { name: 'Magnum de champagne', value: 11200, weight: 8, rarity: 'RARE', emoji: '🍾' },
    { name: 'Table VIP en boîte', value: 16400, weight: 5, rarity: 'EPIC', emoji: '🍹' },
    { name: 'Soirée privée', value: 33500, weight: 2, rarity: 'LEGENDARY', emoji: '🎉' },
  ],
  TROPICALE: [
    { name: 'Tongs de luxe', value: 5100, weight: 30, rarity: 'COMMON', emoji: '🩴' },
    { name: 'Cocktail exotique', value: 7300, weight: 25, rarity: 'COMMON', emoji: '🍹' },
    { name: 'Planche de surf', value: 9600, weight: 18, rarity: 'UNCOMMON', emoji: '🏄' },
    { name: 'Hamac premium', value: 12400, weight: 12, rarity: 'UNCOMMON', emoji: '🌴' },
    { name: 'Jet-ski', value: 17000, weight: 8, rarity: 'RARE', emoji: '🚤' },
    { name: 'Bungalow sur pilotis', value: 24900, weight: 5, rarity: 'EPIC', emoji: '🏖️' },
    { name: 'Île déserte (séjour)', value: 50900, weight: 2, rarity: 'LEGENDARY', emoji: '🏝️' },
  ],
  CASSE: [
    { name: 'Masque de braqueur', value: 8600, weight: 30, rarity: 'COMMON', emoji: '🎭' },
    { name: 'Pied-de-biche', value: 12400, weight: 25, rarity: 'COMMON', emoji: '🛠️' },
    { name: 'Sac de billets marqués', value: 16200, weight: 18, rarity: 'UNCOMMON', emoji: '💸' },
    { name: 'Coffre-fort portable', value: 21000, weight: 12, rarity: 'UNCOMMON', emoji: '🔐' },
    { name: 'Lingot d\'argent', value: 28600, weight: 8, rarity: 'RARE', emoji: '🥈' },
    { name: 'Lingot d\'or', value: 41900, weight: 5, rarity: 'EPIC', emoji: '🥇' },
    { name: 'Butin du grand casse', value: 85800, weight: 2, rarity: 'LEGENDARY', emoji: '💰' },
  ],
  VEGAS: [
    { name: 'Jetons de casino', value: 15400, weight: 30, rarity: 'COMMON', emoji: '🎰' },
    { name: 'Carte VIP tapis', value: 22200, weight: 25, rarity: 'COMMON', emoji: '🃏' },
    { name: 'Dés porte-bonheur', value: 29000, weight: 18, rarity: 'UNCOMMON', emoji: '🎲' },
    { name: 'Nuit en suite', value: 37500, weight: 12, rarity: 'UNCOMMON', emoji: '🛎️' },
    { name: 'Spectacle privé', value: 51200, weight: 8, rarity: 'RARE', emoji: '🎤' },
    { name: 'Jackpot en espèces', value: 75100, weight: 5, rarity: 'EPIC', emoji: '💵' },
    { name: 'Penthouse du Strip', value: 153600, weight: 2, rarity: 'LEGENDARY', emoji: '🏙️' },
  ],
  COLLECTIONNEUR: [
    { name: 'Montre vintage', value: 20200, weight: 30, rarity: 'COMMON', emoji: '⌚' },
    { name: 'Vinyle rare signé', value: 29200, weight: 25, rarity: 'COMMON', emoji: '💿' },
    { name: 'Carte de collection', value: 38100, weight: 18, rarity: 'UNCOMMON', emoji: '🃏' },
    { name: 'Statuette d\'art', value: 49400, weight: 12, rarity: 'UNCOMMON', emoji: '🗿' },
    { name: 'Manuscrit ancien', value: 67300, weight: 8, rarity: 'RARE', emoji: '📜' },
    { name: 'Tableau signé', value: 98700, weight: 5, rarity: 'EPIC', emoji: '🖼️' },
    { name: 'Pièce de musée', value: 201900, weight: 2, rarity: 'LEGENDARY', emoji: '🏆' },
  ],
  PARRAIN: [
    { name: 'Costume rayé', value: 26600, weight: 30, rarity: 'COMMON', emoji: '🤵' },
    { name: 'Cigare cubain', value: 38500, weight: 25, rarity: 'COMMON', emoji: '🚬' },
    { name: 'Bague de la famille', value: 50300, weight: 18, rarity: 'UNCOMMON', emoji: '💍' },
    { name: 'Berline blindée', value: 65100, weight: 12, rarity: 'UNCOMMON', emoji: '🚙' },
    { name: 'Montre en or massif', value: 88800, weight: 8, rarity: 'RARE', emoji: '⌚' },
    { name: 'Restaurant (parts)', value: 130200, weight: 5, rarity: 'EPIC', emoji: '🍝' },
    { name: 'Empire de la pègre', value: 266300, weight: 2, rarity: 'LEGENDARY', emoji: '👑' },
  ],
  DIAMANT_NOIR: [
    { name: 'Boutons de manchette', value: 20700, weight: 30, rarity: 'COMMON', emoji: '🔘' },
    { name: 'Stylo de luxe', value: 24300, weight: 25, rarity: 'COMMON', emoji: '🖋️' },
    { name: 'Bracelet en onyx', value: 27200, weight: 18, rarity: 'UNCOMMON', emoji: '📿' },
    { name: 'Montre squelette', value: 31100, weight: 12, rarity: 'UNCOMMON', emoji: '⌚' },
    { name: 'Diamant noir brut', value: 37000, weight: 8, rarity: 'RARE', emoji: '💠' },
    { name: 'Parure exclusive', value: 47400, weight: 5, rarity: 'EPIC', emoji: '💎' },
    { name: 'Coffret joaillier', value: 82900, weight: 2, rarity: 'LEGENDARY', emoji: '🖤' },
  ],
  PRESIDENTIELLE: [
    { name: 'Stylo présidentiel', value: 69800, weight: 30, rarity: 'COMMON', emoji: '🖋️' },
    { name: 'Médaille d\'honneur', value: 81800, weight: 25, rarity: 'COMMON', emoji: '🎖️' },
    { name: 'Limousine blindée', value: 91700, weight: 18, rarity: 'UNCOMMON', emoji: '🚘' },
    { name: 'Suite d\'État', value: 104700, weight: 12, rarity: 'UNCOMMON', emoji: '🏛️' },
    { name: 'Œuvre de maître', value: 124700, weight: 8, rarity: 'RARE', emoji: '🖼️' },
    { name: 'Hélicoptère privé', value: 159600, weight: 5, rarity: 'EPIC', emoji: '🚁' },
    { name: 'Domaine présidentiel', value: 279200, weight: 2, rarity: 'LEGENDARY', emoji: '🏰' },
  ],
  COFFRE_ROYAL: [
    { name: 'Couronne sertie', value: 53500, weight: 30, rarity: 'COMMON', emoji: '👑' },
    { name: 'Sceptre royal', value: 62600, weight: 25, rarity: 'COMMON', emoji: '🔱' },
    { name: 'Coffret de saphirs', value: 70300, weight: 18, rarity: 'UNCOMMON', emoji: '💙' },
    { name: 'Tiare en diamants', value: 80200, weight: 12, rarity: 'UNCOMMON', emoji: '💎' },
    { name: 'Trône en or', value: 95500, weight: 8, rarity: 'RARE', emoji: '🪑' },
    { name: 'Trésor de la couronne', value: 122200, weight: 5, rarity: 'EPIC', emoji: '🏆' },
    { name: 'Joyaux royaux', value: 213900, weight: 2, rarity: 'LEGENDARY', emoji: '💠' },
  ],
  LOS_SANTOS: [
    { name: 'T-shirt LS', value: 2900, weight: 30, rarity: 'COMMON', emoji: '👕' },
    { name: 'Skateboard', value: 4100, weight: 25, rarity: 'COMMON', emoji: '🛹' },
    { name: 'Téléphone burner', value: 5400, weight: 18, rarity: 'UNCOMMON', emoji: '📱' },
    { name: 'Lowrider', value: 7000, weight: 12, rarity: 'UNCOMMON', emoji: '🚗' },
    { name: 'Flingue de rue', value: 9500, weight: 8, rarity: 'RARE', emoji: '🔫' },
    { name: 'Appart à Vespucci', value: 14000, weight: 5, rarity: 'EPIC', emoji: '🏢' },
    { name: 'Villa à Vinewood Hills', value: 28600, weight: 2, rarity: 'LEGENDARY', emoji: '🏡' },
  ],
  GROVE_STREET: [
    { name: 'Bandana vert', value: 2300, weight: 30, rarity: 'COMMON', emoji: '🟢' },
    { name: 'Casquette CJ', value: 3400, weight: 25, rarity: 'COMMON', emoji: '🧢' },
    { name: 'Batte de baseball', value: 4400, weight: 18, rarity: 'UNCOMMON', emoji: '🏏' },
    { name: 'Tec-9', value: 5700, weight: 12, rarity: 'UNCOMMON', emoji: '🔫' },
    { name: 'Voiture du hood', value: 7800, weight: 8, rarity: 'RARE', emoji: '🚙' },
    { name: 'Respect de la rue', value: 11400, weight: 5, rarity: 'EPIC', emoji: '✊' },
    { name: 'Territoire du gang', value: 23300, weight: 2, rarity: 'LEGENDARY', emoji: '🏘️' },
  ],
  VINEWOOD: [
    { name: 'Lunettes de star', value: 17800, weight: 30, rarity: 'COMMON', emoji: '🕶️' },
    { name: 'Tapis rouge (pass)', value: 25600, weight: 25, rarity: 'COMMON', emoji: '🎬' },
    { name: 'Champagne de gala', value: 33500, weight: 18, rarity: 'UNCOMMON', emoji: '🍾' },
    { name: 'Cabriolet de luxe', value: 43400, weight: 12, rarity: 'UNCOMMON', emoji: '🏎️' },
    { name: 'Contrat de film', value: 59200, weight: 8, rarity: 'RARE', emoji: '🎥' },
    { name: 'Étoile du Walk of Fame', value: 86800, weight: 5, rarity: 'EPIC', emoji: '⭐' },
    { name: 'Manoir de star', value: 177500, weight: 2, rarity: 'LEGENDARY', emoji: '🏰' },
  ],
  BRAQUAGE_PACIFIC: [
    { name: 'Masque de clown', value: 36300, weight: 30, rarity: 'COMMON', emoji: '🤡' },
    { name: 'Perceuse de coffre', value: 52400, weight: 25, rarity: 'COMMON', emoji: '🔩' },
    { name: 'Sac de cash', value: 68600, weight: 18, rarity: 'UNCOMMON', emoji: '💵' },
    { name: 'Fusil d\'assaut', value: 88700, weight: 12, rarity: 'UNCOMMON', emoji: '🔫' },
    { name: 'Van de fuite', value: 121000, weight: 8, rarity: 'RARE', emoji: '🚐' },
    { name: 'Lingots de la banque', value: 177500, weight: 5, rarity: 'EPIC', emoji: '🪙' },
    { name: 'Magot du Pacific Standard', value: 363000, weight: 2, rarity: 'LEGENDARY', emoji: '💰' },
  ],
  IMPORT_EXPORT: [
    { name: 'Clés de voiture', value: 10800, weight: 30, rarity: 'COMMON', emoji: '🔑' },
    { name: 'GPS de luxe', value: 15700, weight: 25, rarity: 'COMMON', emoji: '🛰️' },
    { name: 'Jantes chromées', value: 20500, weight: 18, rarity: 'UNCOMMON', emoji: '⚙️' },
    { name: 'Sportive volée', value: 26500, weight: 12, rarity: 'UNCOMMON', emoji: '🏎️' },
    { name: 'Entrepôt (part)', value: 36100, weight: 8, rarity: 'RARE', emoji: '🏭' },
    { name: 'Supercar customisée', value: 53000, weight: 5, rarity: 'EPIC', emoji: '🚘' },
    { name: 'Flotte de luxe', value: 108400, weight: 2, rarity: 'LEGENDARY', emoji: '🚗' },
  ],
  CARTEL: [
    { name: 'Sachet suspect', value: 21200, weight: 30, rarity: 'COMMON', emoji: '💊' },
    { name: 'Balance de précision', value: 30600, weight: 25, rarity: 'COMMON', emoji: '⚖️' },
    { name: 'Liasse de narcodollars', value: 40000, weight: 18, rarity: 'UNCOMMON', emoji: '💵' },
    { name: 'Pickup blindé', value: 51800, weight: 12, rarity: 'UNCOMMON', emoji: '🛻' },
    { name: 'Laboratoire (part)', value: 70600, weight: 8, rarity: 'RARE', emoji: '⚗️' },
    { name: 'Cargaison complète', value: 103600, weight: 5, rarity: 'EPIC', emoji: '📦' },
    { name: 'Empire du cartel', value: 211900, weight: 2, rarity: 'LEGENDARY', emoji: '👑' },
  ],
  COURSE_ILLEGALE: [
    { name: 'Casque de pilote', value: 6200, weight: 30, rarity: 'COMMON', emoji: '🪖' },
    { name: 'Bonbonne de nitro', value: 9000, weight: 25, rarity: 'COMMON', emoji: '💨' },
    { name: 'Pneus slick', value: 11700, weight: 18, rarity: 'UNCOMMON', emoji: '🛞' },
    { name: 'Tuner japonaise', value: 15200, weight: 12, rarity: 'UNCOMMON', emoji: '🏎️' },
    { name: 'Trophée de course', value: 20700, weight: 8, rarity: 'RARE', emoji: '🏆' },
    { name: 'Hypercar de course', value: 30300, weight: 5, rarity: 'EPIC', emoji: '🚥' },
    { name: 'Titre du roi de la rue', value: 62100, weight: 2, rarity: 'LEGENDARY', emoji: '🏁' },
  ],
  MAZE_BANK: [
    { name: 'Carte Platinum', value: 69800, weight: 30, rarity: 'COMMON', emoji: '💳' },
    { name: 'Stylo en or', value: 81800, weight: 25, rarity: 'COMMON', emoji: '🖋️' },
    { name: 'Mallette de billets', value: 91700, weight: 18, rarity: 'UNCOMMON', emoji: '💼' },
    { name: 'Berline d\'affaires', value: 104700, weight: 12, rarity: 'UNCOMMON', emoji: '🚘' },
    { name: 'Bureau au sommet', value: 124700, weight: 8, rarity: 'RARE', emoji: '🏙️' },
    { name: 'Action de la Maze Bank', value: 159600, weight: 5, rarity: 'EPIC', emoji: '📈' },
    { name: 'Fortune des élites', value: 279200, weight: 2, rarity: 'LEGENDARY', emoji: '💰' },
  ],
  CASINO_DIAMOND: [
    { name: 'Jetons Diamond', value: 41400, weight: 30, rarity: 'COMMON', emoji: '🎰' },
    { name: 'Cocktail VIP', value: 48500, weight: 25, rarity: 'COMMON', emoji: '🍸' },
    { name: 'Carte de membre or', value: 54500, weight: 18, rarity: 'UNCOMMON', emoji: '🃏' },
    { name: 'Penthouse du casino', value: 62200, weight: 12, rarity: 'UNCOMMON', emoji: '🛎️' },
    { name: 'Voiture du jackpot', value: 74000, weight: 8, rarity: 'RARE', emoji: '🏎️' },
    { name: 'Suite présidentielle', value: 94700, weight: 5, rarity: 'EPIC', emoji: '🏨' },
    { name: 'Coffre du Diamond', value: 165800, weight: 2, rarity: 'LEGENDARY', emoji: '💎' },
  ],
  MONT_CHILIAD: [
    { name: 'Carte au trésor', value: 1900, weight: 30, rarity: 'COMMON', emoji: '🗺️' },
    { name: 'Jumelles', value: 3000, weight: 25, rarity: 'COMMON', emoji: '🔭' },
    { name: 'Sac de randonnée', value: 4400, weight: 18, rarity: 'UNCOMMON', emoji: '🎒' },
    { name: 'Jetpack (rumeur)', value: 6700, weight: 12, rarity: 'UNCOMMON', emoji: '🛸' },
    { name: 'Indice du mystère', value: 11900, weight: 8, rarity: 'RARE', emoji: '🛐' },
    { name: 'Épave secrète', value: 25900, weight: 5, rarity: 'EPIC', emoji: '🛩️' },
    { name: 'Trésor du Mont Chiliad', value: 66700, weight: 2, rarity: 'LEGENDARY', emoji: '💎' },
  ],
}

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