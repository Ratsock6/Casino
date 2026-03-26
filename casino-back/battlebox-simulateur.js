#!/usr/bin/env node

/**
 * 🎰 Battle Box — Simulateur de RTP
 * Usage: node simulate-battlebox.js [nbParties] [boxType] [nbJoueurs]
 * Exemple: node simulate-battlebox.js 10000 STANDARD 2
 */

// ─── Catalogue des box ────────────────────────────────────────────────────────

const BOX_CATALOG = {
  STANDARD: { price: 10000, label: 'Box Standard' },
  PREMIUM:  { price: 25000, label: 'Box Premium' },
  ELITE:    { price: 50000, label: 'Box Elite' },
  VIP:      { price: 15000, label: 'Box VIP' },
};

const BOX_ITEMS = {
  STANDARD: [
    { name: 'Montre classique',       value: 5000,  weight: 30, rarity: 'COMMON'    },
    { name: 'Costume élégant',        value: 7000,  weight: 25, rarity: 'COMMON'    },
    { name: 'Bouteille de whisky',    value: 8000,  weight: 20, rarity: 'UNCOMMON'  },
    { name: 'Attaché-case en cuir',   value: 10000, weight: 12, rarity: 'UNCOMMON'  },
    { name: 'Pistolet de collection', value: 14000, weight: 8,  rarity: 'RARE'      },
    { name: 'Bague en or',            value: 18000, weight: 4,  rarity: 'EPIC'      },
    { name: 'Tableau de maître',      value: 35000, weight: 1,  rarity: 'LEGENDARY' },
  ],
  PREMIUM: [
    { name: 'Montre de luxe',         value: 12000, weight: 30, rarity: 'COMMON'    },
    { name: 'Costume sur mesure',     value: 18000, weight: 25, rarity: 'COMMON'    },
    { name: 'Champagne millésimé',    value: 20000, weight: 18, rarity: 'UNCOMMON'  },
    { name: 'Moto personnalisée',     value: 28000, weight: 12, rarity: 'UNCOMMON'  },
    { name: 'Fusil de chasse',        value: 35000, weight: 8,  rarity: 'RARE'      },
    { name: 'Collier de diamants',    value: 45000, weight: 5,  rarity: 'EPIC'      },
    { name: 'Voiture de sport',       value: 90000, weight: 2,  rarity: 'LEGENDARY' },
  ],
  ELITE: [
    { name: 'Rolex Daytona',          value: 25000,  weight: 28, rarity: 'COMMON'    },
    { name: 'Costume Brioni',         value: 32000,  weight: 22, rarity: 'COMMON'    },
    { name: 'Cave à vin privée',      value: 40000,  weight: 16, rarity: 'UNCOMMON'  },
    { name: 'Appartement downtown',   value: 55000,  weight: 14, rarity: 'UNCOMMON'  },
    { name: 'Jet privé (place)',      value: 65000,  weight: 10, rarity: 'RARE'      },
    { name: 'Yacht privé',            value: 85000,  weight: 6,  rarity: 'EPIC'      },
    { name: 'Villa en bord de mer',   value: 130000, weight: 4,  rarity: 'LEGENDARY' },
  ],
  VIP: [
    { name: 'Montre Patek Philippe',  value: 7000,  weight: 28, rarity: 'COMMON'    },
    { name: 'Tenue exclusive casino', value: 9000,  weight: 24, rarity: 'COMMON'    },
    { name: 'Voiture de luxe',        value: 12000, weight: 18, rarity: 'UNCOMMON'  },
    { name: 'Penthouse view',         value: 17000, weight: 14, rarity: 'UNCOMMON'  },
    { name: 'Supercar exclusive',     value: 25000, weight: 10, rarity: 'RARE'      },
    { name: 'Île privée (séjour)',    value: 35000, weight: 5,  rarity: 'EPIC'      },
    { name: 'Manoir privé',           value: 80000, weight: 1,  rarity: 'LEGENDARY' },
  ],
};

// ─── Utilitaires ──────────────────────────────────────────────────────────────

const drawItem = (boxType) => {
  const items = BOX_ITEMS[boxType];
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  for (const item of items) {
    random -= item.weight;
    if (random <= 0) return item;
  }
  return items[items.length - 1];
};

const calculateTheoreticalEV = (boxType) => {
  const items = BOX_ITEMS[boxType];
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  return items.reduce((ev, item) => ev + item.value * (item.weight / totalWeight), 0);
};

const fmt = (n) => Math.round(n).toLocaleString('fr-FR');
const pct = (n) => (n * 100).toFixed(2) + '%';
const separator = (char = '─', len = 70) => char.repeat(len);

// ─── Simulation ───────────────────────────────────────────────────────────────

const simulate = (nbGames, boxType, nbPlayers, commissionPct = 5) => {
  const box = BOX_CATALOG[boxType];
  if (!box) {
    console.error(`❌ Type de box invalide : ${boxType}`);
    console.error(`Types disponibles : ${Object.keys(BOX_CATALOG).join(', ')}`);
    process.exit(1);
  }

  const theoreticalEV = calculateTheoreticalEV(boxType);
  const theoreticalRTP = theoreticalEV / box.price;

  console.log('\n' + separator('═'));
  console.log(`🎰  BATTLE BOX — SIMULATEUR DE RTP`);
  console.log(separator('═'));
  console.log(`📦  Box          : ${box.label} (${fmt(box.price)} 🪙)`);
  console.log(`👥  Joueurs      : ${nbPlayers} par partie`);
  console.log(`🎮  Parties      : ${fmt(nbGames)}`);
  console.log(`💸  Commission   : ${commissionPct}%`);
  console.log(`📊  EV théorique : ${fmt(theoreticalEV)} 🪙 (RTP théorique : ${pct(theoreticalRTP)})`);
  console.log(separator());

  // Stats globales
  let totalMises = 0;
  let totalCommissions = 0;
  let totalObjetsDistribues = 0;
  let totalGagneParJoueurs = 0;
  let casinoProfit = 0;

  // Stats par rareté
  const rarityCount = { COMMON: 0, UNCOMMON: 0, RARE: 0, EPIC: 0, LEGENDARY: 0 };
  const rarityValue = { COMMON: 0, UNCOMMON: 0, RARE: 0, EPIC: 0, LEGENDARY: 0 };

  // Historique des gains joueurs (pour min/max/avg)
  const playerGains = [];

  for (let g = 0; g < nbGames; g++) {
    const stakesPerPlayer = box.price;
    const totalPot = stakesPerPlayer * nbPlayers;
    const commission = Math.floor(totalPot * commissionPct / 100);

    // Tire les objets pour chaque joueur
    const playerResults = [];
    for (let p = 0; p < nbPlayers; p++) {
      const item = drawItem(boxType);
      rarityCount[item.rarity]++;
      rarityValue[item.rarity] += item.value;
      playerResults.push({ value: item.value, item });
    }

    // Total objets distribués
    const totalObjets = playerResults.reduce((sum, r) => sum + r.value, 0);
    totalObjetsDistribues += totalObjets;

    // Le gagnant reçoit la somme des objets
    const winner = playerResults.reduce((best, r) => r.value > best.value ? r : best);
    const payout = totalObjets; // le gagnant reçoit tous les objets

    // Stats
    totalMises += totalPot;
    totalCommissions += commission;
    totalGagneParJoueurs += payout;
    casinoProfit += totalPot - payout;

    // Gain net du gagnant (payout - sa mise)
    const winnerNet = payout - stakesPerPlayer;
    playerGains.push(winnerNet);
  }

  // Calculs finaux
  const rtpReel = totalGagneParJoueurs / totalMises;
  const margeReelle = 1 - rtpReel;
  const profitMoyenParPartie = casinoProfit / nbGames;
  const totalItemsDrawn = nbGames * nbPlayers;

  const minGain = Math.min(...playerGains);
  const maxGain = Math.max(...playerGains);
  const avgGain = playerGains.reduce((a, b) => a + b, 0) / playerGains.length;

  // ─── Affichage des résultats ─────────────────────────────────────────────

  console.log('\n📈  RÉSULTATS GLOBAUX');
  console.log(separator());
  console.log(`Total misé            : ${fmt(totalMises)} 🪙`);
  console.log(`Total redistribué     : ${fmt(totalGagneParJoueurs)} 🪙`);
  console.log(`Total commissions     : ${fmt(totalCommissions)} 🪙`);
  console.log(`Profit casino         : ${fmt(casinoProfit)} 🪙`);
  console.log(`Profit moyen/partie   : ${fmt(profitMoyenParPartie)} 🪙`);
  console.log(separator());
  console.log(`RTP théorique         : ${pct(theoreticalRTP)}`);
  console.log(`RTP réel simulé       : ${pct(rtpReel)}`);
  console.log(`Marge casino réelle   : ${pct(margeReelle)}`);
  console.log(`Écart vs théorique    : ${((rtpReel - theoreticalRTP) * 100).toFixed(4)}%`);

  console.log('\n🏆  GAINS DES JOUEURS (gagnant par partie)');
  console.log(separator());
  console.log(`Gain moyen (net)      : ${fmt(avgGain)} 🪙`);
  console.log(`Gain max              : ${fmt(maxGain)} 🪙`);
  console.log(`Perte max             : ${fmt(minGain)} 🪙`);

  console.log('\n🎲  RÉPARTITION DES RARETÉS');
  console.log(separator());
  const rarities = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'];
  for (const rarity of rarities) {
    const count = rarityCount[rarity];
    const freq = count / totalItemsDrawn;
    const avgVal = count > 0 ? rarityValue[rarity] / count : 0;
    const bar = '█'.repeat(Math.round(freq * 40)).padEnd(40);
    console.log(`${rarity.padEnd(10)} ${bar} ${pct(freq).padStart(7)} | moy: ${fmt(avgVal)} 🪙 | n=${fmt(count)}`);
  }

  console.log('\n💰  ANALYSE DE RENTABILITÉ');
  console.log(separator());
  const isProfit = casinoProfit > 0;
  console.log(`Casino ${isProfit ? '✅ PROFITABLE' : '❌ DÉFICITAIRE'}`);
  console.log(`Marge nette           : ${pct(margeReelle)}`);
  console.log(`ROI casino            : ${((casinoProfit / totalMises) * 100).toFixed(2)}%`);

  // Projection
  const gamesPerDay = 100;
  const projectionJour = profitMoyenParPartie * gamesPerDay;
  const projectionSemaine = projectionJour * 7;
  const projectionMois = projectionJour * 30;

  console.log('\n📅  PROJECTION (basée sur ' + gamesPerDay + ' parties/jour)');
  console.log(separator());
  console.log(`Jour                  : ${fmt(projectionJour)} 🪙`);
  console.log(`Semaine               : ${fmt(projectionSemaine)} 🪙`);
  console.log(`Mois                  : ${fmt(projectionMois)} 🪙`);
  console.log(separator('═'));
  console.log();
};

// ─── Simulation de toutes les box ────────────────────────────────────────────

const simulateAll = (nbGames, nbPlayers, commissionPct) => {
  console.log('\n' + '═'.repeat(70));
  console.log('🎰  COMPARAISON TOUTES LES BOX');
  console.log('═'.repeat(70));
  console.log(`${'Box'.padEnd(15)} ${'Prix'.padStart(10)} ${'EV théo'.padStart(12)} ${'RTP théo'.padStart(10)} ${'RTP réel'.padStart(10)} ${'Marge'.padStart(8)}`);
  console.log('─'.repeat(70));

  for (const [boxType, box] of Object.entries(BOX_CATALOG)) {
    const theoreticalEV = calculateTheoreticalEV(boxType);
    const theoreticalRTP = theoreticalEV / box.price;

    // Simulation rapide
    let totalMises = 0;
    let totalGagne = 0;

    for (let g = 0; g < nbGames; g++) {
      const totalPot = box.price * nbPlayers;
      let totalObjets = 0;
      for (let p = 0; p < nbPlayers; p++) {
        totalObjets += drawItem(boxType).value;
      }
      totalMises += totalPot;
      totalGagne += totalObjets;
    }

    const rtpReel = totalGagne / totalMises;
    const marge = 1 - rtpReel;

    console.log(
      `${box.label.padEnd(15)} ` +
      `${fmt(box.price).padStart(10)} 🪙 ` +
      `${fmt(theoreticalEV).padStart(9)} 🪙 ` +
      `${pct(theoreticalRTP).padStart(10)} ` +
      `${pct(rtpReel).padStart(10)} ` +
      `${pct(marge).padStart(8)}`
    );
  }
  console.log('═'.repeat(70));
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const nbGames      = parseInt(args[0]) || 10000;
const boxType      = (args[1] || 'ALL').toUpperCase();
const nbPlayers    = parseInt(args[2]) || 2;
const commissionPct = parseFloat(args[3]) || 5;

if (boxType === 'ALL') {
  simulateAll(nbGames, nbPlayers, commissionPct);
  for (const type of Object.keys(BOX_CATALOG)) {
    simulate(nbGames, type, nbPlayers, commissionPct);
  }
} else {
  simulate(nbGames, boxType, nbPlayers, commissionPct);
}