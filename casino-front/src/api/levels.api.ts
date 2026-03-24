import axiosInstance from '../utils/axios.instance';

export interface PlayerLevel {
  level: number;
  currentXp: number;
  totalXp: number;
  xpForNextLevel: number;
  progressPercent: number;
  nextReward: {
    tokens?: number;
    vipDuration?: string;
    badge?: string;
    ingame?: string;
    description: string;
  } | null;
  rewards: LevelReward[];
}

export interface LevelReward {
  id: string;
  level: number;
  rewardType: string;
  rewardValue: string;
  isIngame: boolean;
  ingameClaimed: boolean;
  ingameClaimedAt: string | null;
  claimedAt: string;
}

export interface RewardTableEntry {
  level: number;
  tokens?: number;
  vipDuration?: string;
  badge?: string;
  ingame?: string;
  description: string;
}

export interface IngameReward {
  id: string;
  level: number;
  rewardValue: string;
  claimedAt: string;
  ingameClaimed: boolean;
  ingameClaimedAt: string | null;
  user: {
    username: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
}

export const getMyLevelApi = async (): Promise<PlayerLevel> => {
  const res = await axiosInstance.get('/levels/me');
  return res.data;
};

export const getLevelLeaderboardApi = async () => {
  const res = await axiosInstance.get('/levels/leaderboard');
  return res.data;
};

export const getRewardsTableApi = async (): Promise<RewardTableEntry[]> => {
  const res = await axiosInstance.get('/levels/rewards');
  return res.data;
};

export const getAllIngameRewardsApi = async (): Promise<IngameReward[]> => {
  const res = await axiosInstance.get('/levels/admin/ingame');
  return res.data;
};

export const getPendingIngameRewardsApi = async (): Promise<IngameReward[]> => {
  const res = await axiosInstance.get('/levels/admin/ingame/pending');
  return res.data;
};

export const claimIngameRewardApi = async (rewardId: string): Promise<void> => {
  await axiosInstance.patch(`/levels/admin/ingame/${rewardId}/claim`);
};

export const getUnclaimedRewardsApi = async () => {
  const res = await axiosInstance.get('/levels/me/unclaimed');
  return res.data;
};

export const claimRewardApi = async (rewardId: string): Promise<{ message: string; tokens: number }> => {
  const res = await axiosInstance.patch(`/levels/me/claim/${rewardId}`);
  return res.data;
};