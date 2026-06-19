import { Injectable } from '@nestjs/common';
import { BetService } from '../bet/bet.service';
import { GameType } from '../generated/prisma/client';
import { UserRole } from '../generated/prisma/client';
import { GameConfigService } from '../game-config/game-config.service';
import { CasinoConfigService } from '../casino-config/casino-config.service';
import {
  SLOT_SYMBOLS,
  SlotSymbol,
  SlotSymbolConfig,
  SlotsRtpMode,
  SLOTS_BLANK_WEIGHT,
  DEFAULT_SLOTS_RTP_MODE,
} from './config/slots.config';


@Injectable()
export class SlotsService {
  constructor(
    private readonly betService: BetService,
    private readonly gameConfigService: GameConfigService,
    private readonly casinoConfigService: CasinoConfigService,
  ) {}

  async spin(userId: string, role: UserRole, betAmount: number) {
    this.gameConfigService.assertBetAmountAllowed('SLOTS', role, betAmount);
    
    const placedBet = await this.betService.placeBet({
      userId,
      gameType: GameType.SLOTS,
      amount: betAmount,
      metadata: {
        mode: 'classic',
      },
    });

    // Lit le mode RTP courant (réglable depuis le panel admin)
    const rtpMode = await this.getRtpMode();
    const blankWeight = SLOTS_BLANK_WEIGHT[rtpMode] ?? 0;

    const reels: SlotSymbol[] = [
      this.getWeightedRandomSymbol(blankWeight),
      this.getWeightedRandomSymbol(blankWeight),
      this.getWeightedRandomSymbol(blankWeight),
    ];

    const winResult = this.evaluateSpin(reels, betAmount);

    // Remplace les rouleaux "blank" par des symboles d'affichage réels (visuel front),
    // en garantissant qu'ils ne reconstituent pas une combinaison gagnante.
    this.materializeBlankReels(reels);

    if (winResult.isWin) {
      const settled = await this.betService.settleWin({
        roundId: placedBet.roundId,
        payout: winResult.payout,
        multiplier: winResult.multiplier,
        metadata: {
          reels,
          isWin: true,
          winningSymbol: winResult.winningSymbol,
          payoutMultiplier: winResult.multiplier,
        },
      });

      return {
        roundId: placedBet.roundId,
        gameType: GameType.SLOTS,
        bet: betAmount,
        reels,
        isWin: true,
        winningSymbol: winResult.winningSymbol,
        multiplier: winResult.multiplier,
        payout: winResult.payout,
        balanceBeforeBet: placedBet.balanceBefore,
        balanceAfterBet: placedBet.balanceAfter,
        balanceAfterSettlement: settled.balanceAfter,
      };
    }

    await this.betService.settleLoss({
      roundId: placedBet.roundId,
      metadata: {
        reels,
        isWin: false,
      },
    });

    return {
      roundId: placedBet.roundId,
      gameType: GameType.SLOTS,
      bet: betAmount,
      reels,
      isWin: false,
      winningSymbol: null,
      multiplier: 0,
      payout: 0,
      balanceBeforeBet: placedBet.balanceBefore,
      balanceAfterBet: placedBet.balanceAfter,
      balanceAfterSettlement: placedBet.balanceAfter,
    };
  }

  // Lit le mode RTP depuis la config (CasinoConfig clé SLOTS_RTP_MODE), défaut '91'.
  private async getRtpMode(): Promise<SlotsRtpMode> {
    try {
      const raw = await this.casinoConfigService.get('SLOTS_RTP_MODE');
      if (raw === '85' || raw === '91') return raw;
    } catch {
      // config indisponible → défaut
    }
    return DEFAULT_SLOTS_RTP_MODE;
  }

  // Tirage pondéré d'un symbole, avec un poids "blank" optionnel.
  // Si le tirage tombe dans la zone "blank", le rouleau est non-gagnant : on lui
  // assigne un symbole d'affichage qui ne forme pas de combinaison (préfixe interne).
  // On retourne alors un symbole "perdant" en cassant volontairement toute égalité.
  private getWeightedRandomSymbol(blankWeight = 0): SlotSymbol {
    const symbolsWeight = SLOT_SYMBOLS.reduce((sum, s) => sum + s.weight, 0);
    const totalWeight = symbolsWeight + blankWeight;

    let random = Math.floor(Math.random() * totalWeight);

    // Zone "blank" : au-delà du poids des symboles → rouleau non-gagnant.
    if (random >= symbolsWeight) {
      // Marque ce rouleau comme blank via un symbole d'affichage neutre.
      // On choisit un symbole d'affichage aléatoire parmi les 5 (visuel),
      // mais on le préfixe pour qu'il ne matche jamais lors de l'évaluation.
      return '__BLANK__' as SlotSymbol;
    }

    for (const symbolConfig of SLOT_SYMBOLS) {
      if (random < symbolConfig.weight) {
        return symbolConfig.symbol;
      }
      random -= symbolConfig.weight;
    }

    return SLOT_SYMBOLS[0].symbol;
  }

  // Remplace les '__BLANK__' par de vrais symboles pour l'affichage, sans jamais
  // créer 3 symboles identiques (le spin était déjà évalué comme perdant).
  private materializeBlankReels(reels: SlotSymbol[]): void {
    const pool = SLOT_SYMBOLS.map((s) => s.symbol);
    for (let i = 0; i < reels.length; i++) {
      if ((reels[i] as string) === '__BLANK__') {
        // Choisit un symbole différent des deux autres rouleaux pour éviter un faux 3-identiques
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

  private evaluateSpin(reels: SlotSymbol[], betAmount: number) {
    const [first, second, third] = reels;

    // Un rouleau "blank" ne forme jamais de combinaison gagnante.
    const hasBlank = reels.some((r) => (r as string) === '__BLANK__');

    if (!hasBlank && first === second && second === third) {
      const symbolConfig = this.getSymbolConfig(first);
      const multiplier = symbolConfig.payoutMultiplier;
      const payout = betAmount * multiplier;

      return {
        isWin: true,
        winningSymbol: first,
        multiplier,
        payout,
      };
    }

    return {
      isWin: false,
      winningSymbol: null,
      multiplier: 0,
      payout: 0,
    };
  }

  private getSymbolConfig(symbol: SlotSymbol): SlotSymbolConfig {
    const config = SLOT_SYMBOLS.find((entry) => entry.symbol === symbol);

    if (!config) {
      throw new Error(`Missing slot config for symbol: ${symbol}`);
    }

    return config;
  }
}