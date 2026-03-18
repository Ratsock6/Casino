import axiosInstance from '../utils/axios.instance';
import type { RouletteBet, RouletteSpinResponse } from '../types/game.types';

export const spinRouletteApi = async (
  bets: RouletteBet[],
  idempotencyKey: string
): Promise<RouletteSpinResponse> => {
  // Supprime le champ numbers si vide ou non nécessaire
  const cleanedBets = bets.map(({ type, numbers, amount }) => {
    const outsideTypes: RouletteBetType[] = [
      'RED', 'BLACK', 'EVEN', 'ODD', 'LOW', 'HIGH',
      'DOZEN_1', 'DOZEN_2', 'DOZEN_3',
      'COLUMN_1', 'COLUMN_2', 'COLUMN_3',
    ];
    if (outsideTypes.includes(type)) {
      return { type, amount };
    }
    return { type, numbers, amount };
  });

  const response = await axiosInstance.post<RouletteSpinResponse>(
    '/roulette/spin',
    { bets: cleanedBets },
    {
      headers: {
        'x-idempotency-key': idempotencyKey,
      },
    }
  );
  return response.data;
};