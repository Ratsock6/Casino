// ─────────────────────────────────────────────────────────────────────────────
//  MOTEUR DES MÉCANIQUES DE MACHINES À SOUS
// ─────────────────────────────────────────────────────────────────────────────
//  Chaque mécanique a un évaluateur pur (sans effet de bord, sans DB) qui prend
//  une config de machine + une mise et retourne le résultat (gain + données
//  d'affichage). Pour ajouter une mécanique : ajouter une fonction ici + un case
//  dans evaluateMachineSpin.
// ─────────────────────────────────────────────────────────────────────────────
import { SlotMachineConfig, SlotSymbolDef } from '../config/machines.config';

// Tirage pondéré d'un symbole parmi le catalogue (avec poids "blank" optionnel).
function drawSymbol(symbols: SlotSymbolDef[], blankWeight = 0): string {
  const symbolsWeight = symbols.reduce((s, sym) => s + sym.weight, 0);
  const total = symbolsWeight + blankWeight;
  let r = Math.floor(Math.random() * total);
  if (r >= symbolsWeight) return '__BLANK__';
  for (const sym of symbols) {
    if (r < sym.weight) return sym.id;
    r -= sym.weight;
  }
  return symbols[0].id;
}

function multiplierOf(symbols: SlotSymbolDef[], id: string): number {
  return symbols.find((s) => s.id === id)?.payoutMultiplier ?? 0;
}

// ── Résultat générique d'un spin ──────────────────────────────────────────────
export interface SpinEvaluation {
  isWin: boolean;
  totalMultiplier: number;   // gain total / mise
  payout: number;            // gain en jetons (mise * totalMultiplier)
  // Données d'affichage (varient selon la mécanique) :
  display: any;
}

// ── MÉCANIQUE 1 : CLASSIC_3 (3 rouleaux, 3 identiques) ───────────────────────
export function evaluateClassic3(
  machine: SlotMachineConfig,
  betAmount: number,
  blankWeight = 0,
): SpinEvaluation {
  const reels: string[] = [
    drawSymbol(machine.symbols, blankWeight),
    drawSymbol(machine.symbols, blankWeight),
    drawSymbol(machine.symbols, blankWeight),
  ];

  const hasBlank = reels.some((r) => r === '__BLANK__');
  let isWin = false;
  let multiplier = 0;
  let winningSymbol: string | null = null;

  if (!hasBlank && reels[0] === reels[1] && reels[1] === reels[2]) {
    isWin = true;
    winningSymbol = reels[0];
    multiplier = multiplierOf(machine.symbols, reels[0]);
  }

  // Remplace les blanks par des symboles d'affichage sans créer de faux gain
  materializeBlanks(reels, machine.symbols);

  const display = reels.map((id) => ({
    id,
    display: machine.symbols.find((s) => s.id === id)?.display ?? id,
  }));

  return {
    isWin,
    totalMultiplier: multiplier,
    payout: betAmount * multiplier,
    display: { reels: display, winningSymbol },
  };
}

function materializeBlanks(reels: string[], symbols: SlotSymbolDef[]) {
  const pool = symbols.map((s) => s.id);
  for (let i = 0; i < reels.length; i++) {
    if (reels[i] === '__BLANK__') {
      const others = reels.filter((_, j) => j !== i);
      let pick = pool[Math.floor(Math.random() * pool.length)];
      let guard = 0;
      while (others.every((o) => o === pick) && guard < 10) {
        pick = pool[Math.floor(Math.random() * pool.length)];
        guard++;
      }
      reels[i] = pick;
    }
  }
}

// ── MÉCANIQUE 2 : CASCADE_3X3 (grille 3x3, lignes + cascades) ────────────────
// Lignes gagnantes : 3 horizontales + 2 diagonales (indices de la grille 0-8).
const CASCADE_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // horizontales
  [0, 4, 8], [2, 4, 6],            // diagonales
];

export function evaluateCascade3x3(
  machine: SlotMachineConfig,
  betAmount: number,
): SpinEvaluation {
  const wildId = machine.wildId;
  const cascadeMults = machine.cascadeMultipliers ?? [1];

  const lineWinner = (grid: string[], line: number[]): string | null => {
    const syms = line.map((i) => grid[i]);
    const nonWild = syms.filter((s) => s !== wildId);
    if (nonWild.length === 0) return wildId ?? null; // 3 wilds
    const target = nonWild[0];
    if (syms.every((s) => s === target || s === wildId)) return target;
    return null;
  };

  // Grille initiale (9 symboles)
  let grid: string[] = Array.from({ length: 9 }, () => drawSymbol(machine.symbols));

  // Étapes de cascade pour l'animation front
  const steps: any[] = [];
  let totalPayout = 0;
  let cascadeLevel = 0;

  // Garde-fou pour éviter une boucle infinie
  while (cascadeLevel < 20) {
    const winningPositions = new Set<number>();
    const winningLines: { line: number[]; symbol: string; amount: number }[] = [];
    const cm = cascadeMults[Math.min(cascadeLevel, cascadeMults.length - 1)];

    for (const line of CASCADE_LINES) {
      const w = lineWinner(grid, line);
      if (w) {
        const amount = betAmount * multiplierOf(machine.symbols, w) * cm;
        totalPayout += amount;
        winningLines.push({ line, symbol: w, amount });
        line.forEach((i) => winningPositions.add(i));
      }
    }

    // Snapshot de cette étape (grille AVANT explosion)
    steps.push({
      grid: gridToDisplay(grid, machine.symbols),
      winningPositions: [...winningPositions],
      winningLines,
      cascadeLevel,
      cascadeMultiplier: cm,
    });

    if (winningPositions.size === 0) break;

    // Explose les gagnants
    winningPositions.forEach((pos) => { grid[pos] = ''; });

    // Gravité par colonne (col 0,1,2 ; row 0 = haut)
    for (let col = 0; col < 3; col++) {
      const column = [grid[col], grid[col + 3], grid[col + 6]].filter((c) => c !== '');
      const filled = [...Array(3 - column.length).fill(''), ...column];
      grid[col] = filled[0];
      grid[col + 3] = filled[1];
      grid[col + 6] = filled[2];
    }

    // Remplit les trous avec de nouveaux symboles
    for (let i = 0; i < 9; i++) {
      if (grid[i] === '') grid[i] = drawSymbol(machine.symbols);
    }

    cascadeLevel++;
  }

  return {
    isWin: totalPayout > 0,
    totalMultiplier: betAmount > 0 ? totalPayout / betAmount : 0,
    payout: totalPayout,
    display: { steps, lines: CASCADE_LINES },
  };
}

function gridToDisplay(grid: string[], symbols: SlotSymbolDef[]) {
  return grid.map((id) => ({
    id,
    display: symbols.find((s) => s.id === id)?.display ?? id,
  }));
}

// ── DISPATCHER ────────────────────────────────────────────────────────────────
export function evaluateMachineSpin(
  machine: SlotMachineConfig,
  betAmount: number,
  blankWeight = 0,
): SpinEvaluation {
  switch (machine.mechanic) {
    case 'CLASSIC_3':
      return evaluateClassic3(machine, betAmount, blankWeight);
    case 'CASCADE_3X3':
      return evaluateCascade3x3(machine, betAmount);
    default:
      throw new Error(`Mécanique inconnue : ${machine.mechanic}`);
  }
}
