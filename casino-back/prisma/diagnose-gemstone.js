/**
 * Script de diagnostic — Gemstone Cascade  (version JS, pas besoin de ts-node)
 * --------------------------------------------------------------------------
 * Rejoue les grilles des spins Gemstone stockées en base et détecte un
 * éventuel gain manqué (ex: WILD 🌟 en diagonale). Lecture seule.
 *
 * Lancement sur le VPS :
 *   cd ~/casino-back
 *   node prisma/diagnose-gemstone.js                 (tous les joueurs)
 *   node prisma/diagnose-gemstone.js scameur         (un joueur précis)
 */
try { require('dotenv').config(); } catch (e) { /* ok */ }

const { PrismaClient } = require('../dist/src/generated/prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL introuvable. Vérifie ton .env dans casino-back/');
  process.exit(1);
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const WILD = 'WILD';
const SYMBOL_TO_EMOJI = {
  RUBY: '❤️', TOPAZ: '🔶', SAPPHIRE: '🔷', EMERALD: '💚',
  AMETHYST: '💜', DIAMOND: '💎', CROWN: '👑', WILD: '🌟',
};
const CASCADE_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // horizontales
  [0, 4, 8], [2, 4, 6],            // diagonales
];

function lineWinner(grid) {
  const wins = [];
  for (const line of CASCADE_LINES) {
    const syms = line.map((i) => grid[i]);
    const nonWild = syms.filter((s) => s !== WILD);
    let winner = null;
    if (nonWild.length === 0) winner = WILD;
    else {
      const target = nonWild[0];
      if (syms.every((s) => s === target || s === WILD)) winner = target;
    }
    if (winner) wins.push({ line, symbol: winner });
  }
  return wins;
}

function hasWildWin(grid) {
  return lineWinner(grid).filter(
    (w) => w.line.some((i) => grid[i] === WILD) && w.symbol !== WILD,
  );
}

function printGrid(grid) {
  const e = grid.map((s) => SYMBOL_TO_EMOJI[s] || s);
  return `\n    ${e[0]} ${e[1]} ${e[2]}\n    ${e[3]} ${e[4]} ${e[5]}\n    ${e[6]} ${e[7]} ${e[8]}`;
}

async function main() {
  const username = process.argv[2];

  let userId;
  if (username) {
    const user = await prisma.user.findFirst({ where: { username } });
    if (!user) { console.log(`❌ Joueur "${username}" introuvable.`); return; }
    userId = user.id;
    console.log(`🔎 Analyse des spins Gemstone de ${username}\n`);
  } else {
    console.log(`🔎 Analyse des spins Gemstone de TOUS les joueurs\n`);
  }

  const rounds = await prisma.gameRound.findMany({
    where: { gameType: 'SLOTS', ...(userId ? { userId } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  });

  let totalGemstone = 0, totalSteps = 0, missedWins = 0, wildInspected = 0;

  for (const round of rounds) {
    const meta = round.metadata;
    if (!meta || meta.machineId !== 'gemstone') continue;
    totalGemstone++;
    const steps = meta.display && meta.display.steps;
    if (!Array.isArray(steps)) continue;

    for (const step of steps) {
      totalSteps++;
      const grid = (step.grid || []).map((c) => c.id);
      if (grid.length !== 9) continue;
      const recordedPositions = step.winningPositions || [];

      const wildWins = hasWildWin(grid);
      if (wildWins.length > 0) {
        wildInspected++;
        for (const ww of wildWins) {
          const allRecorded = ww.line.every((i) => recordedPositions.includes(i));
          if (!allRecorded) {
            missedWins++;
            const isDiag = JSON.stringify(ww.line) === JSON.stringify([0, 4, 8]) ||
                           JSON.stringify(ww.line) === JSON.stringify([2, 4, 6]);
            console.log(`⚠️ GAIN WILD MANQUÉ — round ${round.id}`);
            console.log(`   Ligne ${JSON.stringify(ww.line)} (${isDiag ? 'DIAGONALE' : 'horizontale'}), symbole ${SYMBOL_TO_EMOJI[ww.symbol]}`);
            console.log(`   Grille : ${printGrid(grid)}`);
            console.log(`   Positions enregistrées comme gagnantes : ${JSON.stringify(recordedPositions)}\n`);
          }
        }
      }
    }
  }

  console.log('─'.repeat(60));
  console.log(`📊 RÉSULTAT`);
  console.log(`   Spins Gemstone analysés     : ${totalGemstone}`);
  console.log(`   Étapes de cascade analysées : ${totalSteps}`);
  console.log(`   Grilles avec ligne WILD     : ${wildInspected}`);
  console.log(`   Gains WILD manqués détectés : ${missedWins}\n`);
  if (missedWins === 0) {
    console.log('✅ AUCUN gain WILD manqué. Le moteur a correctement payé toutes');
    console.log('   les lignes gagnantes contenant un WILD (diagonales incluses).');
    console.log('   → Le "bug" signalé est probablement une confusion visuelle.');
  } else {
    console.log(`🔴 ${missedWins} gain(s) WILD réellement manqué(s) — bug confirmé.`);
  }
}

main().catch((e) => console.error(e)).finally(() => prisma.$disconnect());
