import axiosInstance from '../utils/axios.instance';

export interface BlackjackCard {
  rank: string;
  suit: string;
}

export interface BlackjackGame {
  gameId: string;
  status: string;
  betAmount: string;
  playerCards: BlackjackCard[];
  dealerCards: BlackjackCard[];
  playerScore: number;
  dealerScore: number;
}

export const startBlackjackApi = async (
  bet: number,
  idempotencyKey: string
): Promise<BlackjackGame> => {
  const res = await axiosInstance.post(
    '/blackjack/start',
    { bet },
    { headers: { 'x-idempotency-key': idempotencyKey } }
  );
  return res.data;
};

export const blackjackActionApi = async (
  gameId: string,
  action: 'HIT' | 'STAND'
): Promise<BlackjackGame> => {
  const res = await axiosInstance.post('/blackjack/action', { gameId, action });
  return res.data;
};