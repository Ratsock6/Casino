import axiosInstance from '../utils/axios.instance';

// ── Machines disponibles (écran de sélection) ──
export interface SlotMachineInfo {
  id: string;
  name: string;
  description: string;
  theme: 'CLASSIC' | 'GEMSTONE';
  mechanic: 'CLASSIC_3' | 'CASCADE_3X3';
  rtpPercent?: number;
  symbols: { id: string; display: string; payoutMultiplier: number }[];
}

export const getSlotMachinesApi = async (): Promise<SlotMachineInfo[]> => {
  const res = await axiosInstance.get<SlotMachineInfo[]>('/slots/machines');
  return res.data;
};

// ── Réponse de spin (générique, selon la mécanique) ──
export interface SlotSymbolView {
  id: string;
  display: string;
}

export interface CascadeStep {
  grid: SlotSymbolView[];
  winningPositions: number[];
  winningLines: { line: number[]; symbol: string; amount: number }[];
  cascadeLevel: number;
  cascadeMultiplier: number;
}

export interface SlotSpinResponse {
  roundId: string;
  gameType: string;
  machineId: string;
  mechanic: 'CLASSIC_3' | 'CASCADE_3X3';
  bet: number;
  isWin: boolean;
  multiplier: number;
  payout: number;
  display: any; // { reels, winningSymbol } | { steps, lines }
  balanceBeforeBet: string;
  balanceAfterBet: string;
  balanceAfterSettlement: string;
}

export const spinSlotsApi = async (
  bet: number,
  idempotencyKey: string,
  machineId?: string,
): Promise<SlotSpinResponse> => {
  const response = await axiosInstance.post<SlotSpinResponse>(
    '/slots/spin',
    { bet, machineId },
    { headers: { 'x-idempotency-key': idempotencyKey } },
  );
  return response.data;
};
