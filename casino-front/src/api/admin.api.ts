import axiosInstance from '../utils/axios.instance';

export interface AdminUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: 'PLAYER' | 'VIP' | 'ADMIN' | 'SUPER_ADMIN';
  status: 'ACTIVE' | 'BANNED' | 'SUSPENDED';
  createdAt: string;
  wallet: { balance: number };
}

export interface GlobalStats {
  totalUsers: number;
  totalRounds: number;
  totalBet: number;
  totalWin: number;
  casinoRevenue: number;
  roundsByGame: { gameType: string; count: number }[];
}

export interface AdminTransaction {
  id: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reason: string | null;
  gameType: string | null;
  gameRoundId: string | null;
  createdAt: string;
  user: { id: string; username: string };
}

export interface AdminGameRound {
  id: string;
  gameType: string;
  status: string;
  stake: number;
  payout: number;
  multiplier: number | null;
  createdAt: string;
  user: { id: string; username: string };
}

export interface Leaderboard {
  byBalance: { user: { id: string; username: string; role: string }; balance: number }[];
  byWins: { user: { id: string; username: string; role: string }; totalWins: number }[];
  byRounds: { user: { id: string; username: string; role: string }; totalRounds: number }[];
}

export const getAdminUsersApi = async (): Promise<AdminUser[]> => {
  const res = await axiosInstance.get('/admin/users');
  return res.data;
};

export const getGlobalStatsApi = async (): Promise<GlobalStats> => {
  const res = await axiosInstance.get('/admin/stats');
  return res.data;
};

export const getAdminTransactionsApi = async (limit = 50, offset = 0): Promise<AdminTransaction[]> => {
  const res = await axiosInstance.get(`/admin/transactions?limit=${limit}&offset=${offset}`);
  return res.data;
};

export const getAdminGameRoundsApi = async (limit = 50, offset = 0): Promise<AdminGameRound[]> => {
  const res = await axiosInstance.get(`/admin/games?limit=${limit}&offset=${offset}`);
  return res.data;
};

export const getLeaderboardApi = async (): Promise<Leaderboard> => {
  const res = await axiosInstance.get('/admin/leaderboard');
  return res.data;
};

export const getUserWalletApi = async (userId: string) => {
  const res = await axiosInstance.get(`/admin/wallet/${userId}`);
  return res.data;
};

export const getUserTransactionsApi = async (userId: string, limit = 50): Promise<AdminTransaction[]> => {
  const res = await axiosInstance.get(`/admin/wallet/${userId}/history?limit=${limit}`);
  return res.data;
};

export const creditWalletApi = async (userId: string, amount: number, reason?: string) => {
  const res = await axiosInstance.patch('/admin/wallet/credit', { userId, amount, reason });
  return res.data;
};

export const debitWalletApi = async (userId: string, amount: number, reason?: string) => {
  const res = await axiosInstance.patch('/admin/wallet/debit', { userId, amount, reason });
  return res.data;
};

export const updateUserStatusApi = async (
  userId: string,
  status: 'ACTIVE' | 'BANNED' | 'SUSPENDED'
): Promise<void> => {
  await axiosInstance.patch(`/admin/users/${userId}/status`, { status });
};

export const getUserStatsApi = async (userId: string): Promise<UserStats> => {
  const res = await axiosInstance.get(`/admin/users/${userId}/stats`);
  return res.data;
};

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