import axiosInstance from '../utils/axios.instance';

export interface SlotSpinResponse {
  roundId: string;
  gameType: string;
  bet: number;
  reels: string[];
  isWin: boolean;
  winningSymbol: string;
  multiplier: number;
  payout: number;
  balanceBeforeBet: string;
  balanceAfterBet: string;
}

export const spinSlotsApi = async (bet: number, idempotencyKey: string): Promise<SlotSpinResponse> => {
  const response = await axiosInstance.post<SlotSpinResponse>(
    '/slots/spin',
    { bet },
    {
      headers: {
        'x-idempotency-key': idempotencyKey,
      },
    }
  );
  return response.data;
};