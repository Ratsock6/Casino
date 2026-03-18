import axiosInstance from '../utils/axios.instance';

export interface UserProfile {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  phoneNumber: string;
  role: string;
  status: string;
  balance: string;
  createdAt: string;
  lastLoginAt: string;
}

export interface UserTransaction {
  id: string;
  type: string;
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  reason: string | null;
  gameType: string | null;
  gameRoundId: string | null;
  createdAt: string;
}

export interface UserGameRound {
  id: string;
  gameType: string;
  status: string;
  stake: number;
  payout: number;
  multiplier: number | null;
  createdAt: string;
}

export interface UserStats {
  totalRounds: number;
  totalWon: number;
  totalLost: number;
  winRate: number;
  totalStake: number;
  totalPayout: number;
  netResult: number;
  byGame: {
    gameType: string;
    total: number;
    won: number;
    lost: number;
    stake: number;
    payout: number;
  }[];
}

export const getProfileApi = async (): Promise<UserProfile> => {
  const res = await axiosInstance.get('/users/me');
  return res.data;
};

export const getMyTransactionsApi = async (limit = 50): Promise<UserTransaction[]> => {
  const res = await axiosInstance.get(`/wallet/me/history?limit=${limit}`);
  return res.data;
};

export const getMyGameRoundsApi = async (limit = 50): Promise<UserGameRound[]> => {
  const res = await axiosInstance.get(`/game-rounds/me?limit=${limit}`);
  return res.data;
};

export const getMyStatsApi = async (): Promise<UserStats> => {
  const res = await axiosInstance.get('/game-rounds/me/stats');
  return res.data;
};
