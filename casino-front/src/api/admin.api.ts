import axiosInstance from '../utils/axios.instance';

export interface AdminUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  role: 'PLAYER' | 'VIP' | 'ADMIN' | 'SUPER_ADMIN';
  status: 'ACTIVE' | 'BANNED' | 'SUSPENDED';
  createdAt: string;
  wallet: { balance: number };
}

export interface GlobalStats {
  totalUsers: number;
  activeUsers: number;
  totalRounds: number;
  roundsByGame: { gameType: string; count: number }[];
  totalBet: number;
  totalWin: number;
  totalJackpot: number;
  totalLevel: number;
  totalCredit: number;
  totalDebit: number;
  grossRevenue: number;
  netRevenue: number;
  casinoRevenue: number;
  totalRewardCodes: number;
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

export interface CasinoConfig {
  id: string;
  key: string;
  value: string;
  updatedAt: string;
  updatedBy: string | null;
  updatedByUsername: string | null;
}

export interface LoginHistoryEntry {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface BalanceHistoryEntry {
  date: string;
  bets: number;
  wins: number;
  revenue: number;
}

export interface GamesHistoryEntry {
  date: string;
  SLOTS: number;
  ROULETTE: number;
  BLACKJACK: number;
  total: number;
}

export interface AuditLog {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  admin: { id: string; username: string };
}

export interface Alert {
  id: string;
  type: string;
  message: string;
  username: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export const triggerDailyReportApi = async (): Promise<void> => {
  await axiosInstance.post('/admin/reports/daily');
};

export const getAlertsApi = async (limit = 50): Promise<Alert[]> => {
  const res = await axiosInstance.get(`/admin/alerts?limit=${limit}`);
  return res.data;
};

export const getAuditLogsApi = async (limit = 50, offset = 0): Promise<AuditLog[]> => {
  const res = await axiosInstance.get(`/admin/audit-logs?limit=${limit}&offset=${offset}`);
  return res.data;
};

export const getBalanceHistoryApi = async (days = 30): Promise<BalanceHistoryEntry[]> => {
  const res = await axiosInstance.get(`/admin/charts/balance?days=${days}`);
  return res.data;
};

export const getGamesHistoryApi = async (days = 30): Promise<GamesHistoryEntry[]> => {
  const res = await axiosInstance.get(`/admin/charts/games?days=${days}`);
  return res.data;
};

export const getUserLoginHistoryApi = async (userId: string, limit = 20): Promise<LoginHistoryEntry[]> => {
  const res = await axiosInstance.get(`/admin/users/${userId}/login-history?limit=${limit}`);
  return res.data;
};

export const getCasinoConfigApi = async (): Promise<CasinoConfig[]> => {
  const res = await axiosInstance.get('/admin/config');
  return res.data;
};

export const updateCasinoConfigApi = async (key: string, value: string): Promise<void> => {
  await axiosInstance.patch(`/admin/config/${key}`, { value });
};

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

export const getAllTransactionsForExportApi = async (): Promise<AdminTransaction[]> => {
  const res = await axiosInstance.get('/admin/transactions?limit=999999999');
  return res.data;
};

export const getAllGameRoundsForExportApi = async (): Promise<AdminGameRound[]> => {
  const res = await axiosInstance.get('/admin/games?limit=999999999');
  return res.data;
};

export const getMyGameRoundsForExportApi = async (userId: string): Promise<AdminGameRound[]> => {
  const res = await axiosInstance.get(`/admin/games?limit=100000&userId=${userId}`);
  return res.data;
};

export const updateUserRoleApi = async (userId: string, role: 'ADMIN' | 'PLAYER' | 'VIP'): Promise<void> => {
  await axiosInstance.patch(`/admin/users/${userId}/role`, { role });
};

export const grantVipApi = async (
  userId: string,
  duration: string,
  customDays?: number,
): Promise<{ message: string; expiresAt: string | null }> => {
  const res = await axiosInstance.post(`/admin/users/${userId}/vip`, {
    duration,
    customDays,
  });
  return res.data;
};

export const deleteUserApi = async (userId: string): Promise<void> => {
  await axiosInstance.delete(`/admin/users/${userId}`);
};

export const anonymizeUserApi = async (userId: string): Promise<{ message: string }> => {
  const res = await axiosInstance.patch(`/admin/users/${userId}/anonymize`);
  return res.data;
};

export const deanonymizeUserApi = async (userId: string): Promise<{ message: string }> => {
  const res = await axiosInstance.patch(`/admin/users/${userId}/deanonymize`);
  return res.data;
};

export const resetPasswordApi = async (userId: string): Promise<{ message: string; newPassword: string }> => {
  const res = await axiosInstance.patch(`/admin/users/${userId}/reset-password`);
  return res.data;
};


export interface RewardCode {
  id: string;
  code: string;
  description: string | null;
  rewardType: string;
  rewardValue: string;
  maxUses: number | null;
  currentUses: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  isExpired: boolean;
  isFull: boolean;
  recentUses: { username: string; usedAt: string }[];
}

export const getRewardCodesApi = async (): Promise<RewardCode[]> => {
  const res = await axiosInstance.get('/reward-codes/admin');
  return res.data;
};

export const createRewardCodeApi = async (data: {
  code: string;
  description?: string;
  rewardType: string;
  rewardValue: string;
  maxUses?: number;
  expiresAt?: string;
}): Promise<RewardCode> => {
  const res = await axiosInstance.post('/reward-codes/admin', data);
  return res.data;
};

export const toggleRewardCodeApi = async (codeId: string): Promise<void> => {
  await axiosInstance.patch(`/reward-codes/admin/${codeId}/toggle`);
};

export const deleteRewardCodeApi = async (codeId: string): Promise<void> => {
  await axiosInstance.delete(`/reward-codes/admin/${codeId}`);
};


