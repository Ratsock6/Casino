import { Injectable, BadRequestException } from '@nestjs/common';
import { BetService } from '../bet/bet.service';
import { GameType } from '../generated/prisma/client';
import { UserRole } from '../generated/prisma/client';
import { GameConfigService } from '../game-config/game-config.service';
import { CasinoConfigService } from '../casino-config/casino-config.service';
import {
  SLOT_MACHINES,
  DEFAULT_MACHINE_ID,
  getMachineById,
  getPublicMachineList,
  SlotMachineConfig,
} from './config/machines.config';
import { evaluateMachineSpin } from './engine/slot-mechanics';

@Injectable()
export class SlotsService {
  constructor(
    private readonly betService: BetService,
    private readonly gameConfigService: GameConfigService,
    private readonly casinoConfigService: CasinoConfigService,
  ) {}

  // Liste publique des machines disponibles (pour l'écran de sélection).
  listMachines() {
    return getPublicMachineList();
  }

  // Spin générique : choisit la machine, applique sa mécanique, règle le pari.
  async spin(userId: string, role: UserRole, betAmount: number, machineId?: string) {
    this.gameConfigService.assertBetAmountAllowed('SLOTS', role, betAmount);

    const machine = getMachineById(machineId || DEFAULT_MACHINE_ID);
    if (!machine) {
      throw new BadRequestException(`Machine à sous inconnue : ${machineId}`);
    }

    // Poids "blank" : seulement pour la machine classique togglable (RTP mode).
    let blankWeight = 0;
    if (machine.blankWeightByMode) {
      const mode = await this.getRtpMode();
      blankWeight = machine.blankWeightByMode[mode] ?? 0;
    }

    const placedBet = await this.betService.placeBet({
      userId,
      gameType: GameType.SLOTS,
      amount: betAmount,
      metadata: { machineId: machine.id, mechanic: machine.mechanic },
    });

    const result = evaluateMachineSpin(machine, betAmount, blankWeight);

    if (result.isWin) {
      const settled = await this.betService.settleWin({
        roundId: placedBet.roundId,
        payout: result.payout,
        multiplier: result.totalMultiplier,
        metadata: {
          machineId: machine.id,
          mechanic: machine.mechanic,
          isWin: true,
          display: result.display,
          payoutMultiplier: result.totalMultiplier,
        },
      });

      return {
        roundId: placedBet.roundId,
        gameType: GameType.SLOTS,
        machineId: machine.id,
        mechanic: machine.mechanic,
        bet: betAmount,
        isWin: true,
        multiplier: result.totalMultiplier,
        payout: result.payout,
        display: result.display,
        balanceBeforeBet: placedBet.balanceBefore,
        balanceAfterBet: placedBet.balanceAfter,
        balanceAfterSettlement: settled.balanceAfter,
      };
    }

    await this.betService.settleLoss({
      roundId: placedBet.roundId,
      metadata: { machineId: machine.id, mechanic: machine.mechanic, isWin: false, display: result.display },
    });

    return {
      roundId: placedBet.roundId,
      gameType: GameType.SLOTS,
      machineId: machine.id,
      mechanic: machine.mechanic,
      bet: betAmount,
      isWin: false,
      multiplier: 0,
      payout: 0,
      display: result.display,
      balanceBeforeBet: placedBet.balanceBefore,
      balanceAfterBet: placedBet.balanceAfter,
      balanceAfterSettlement: placedBet.balanceAfter,
    };
  }

  // Lit le mode RTP de la machine classique (CasinoConfig clé SLOTS_RTP_MODE), défaut '91'.
  private async getRtpMode(): Promise<string> {
    try {
      const raw = await this.casinoConfigService.get('SLOTS_RTP_MODE');
      if (raw === '85' || raw === '91') return raw;
    } catch {
      // config indisponible → défaut
    }
    return '91';
  }
}
