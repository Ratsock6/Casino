import axiosInstance from '../utils/axios.instance';

export interface BoxConfig {
  type: string;
  price: number;
  rtp: number;
  label: string;
  emoji: string;
  vipOnly: boolean;
  description: string;
  items: { name: string; emoji: string; rarity: string; value: number }[];
}

export interface LobbyGame {
  id: string;
  maxPlayers: number;
  teamSize: number;
  boxTypes: Record<string, number>;
  totalStake: number;
  playerCount: number;
  players: { username: string; role: string }[];
  createdAt: string;
}

export interface BattleBoxGame {
  id: string;
  status: string;
  maxPlayers: number;
  boxTypes: Record<string, number>;
  totalStake: number;
  inviteCode: string | null;
  commissionPct: number;
  players: {
    id: string;
    userId: string;
    teamIndex: number;
    stake: number;
    items: any[] | null;
    totalValue: number | null;
    isWinner: boolean;
    user: { username: string; role: string };
  }[];
}

export interface AdminBattleBoxGame {
  id: string;
  status: string;
  maxPlayers: number;
  boxTypes: Record<string, number>;
  totalStake: number;
  commissionPct: number;
  winnerId: string | null;
  createdAt: string;
  settledAt: string | null;
  players: {
    username: string;
    role: string;
    userId: string;
    stake: number;
    totalValue: number | null;
    isWinner: boolean;
    items: any[] | null;
  }[];
}

export const getBattleBoxCatalogApi = async (): Promise<BoxConfig[]> => {
  const res = await axiosInstance.get('/battle-box/catalog');
  return res.data;
};

export const getBattleBoxLobbyApi = async (): Promise<LobbyGame[]> => {
  const res = await axiosInstance.get('/battle-box/lobby');
  return res.data;
};

export const getBattleBoxGameApi = async (gameId: string): Promise<BattleBoxGame> => {
  const res = await axiosInstance.get(`/battle-box/${gameId}`);
  return res.data;
};

export const createBattleBoxGameApi = async (
  boxSelection: Record<string, number>,
  isPrivate: boolean,
  maxPlayers: number,
): Promise<{ gameId: string; inviteCode: string | null; stake: number; message: string }> => {
  const res = await axiosInstance.post('/battle-box/create', { boxSelection, isPrivate, maxPlayers });
  return res.data;
};

export const joinBattleBoxGameApi = async (
  gameId: string,
  inviteCode?: string,
): Promise<{ gameId: string; stake: number; message: string }> => {
  const res = await axiosInstance.post('/battle-box/join', { gameId, inviteCode });
  return res.data;
};

export const cancelBattleBoxGameApi = async (gameId: string): Promise<void> => {
  await axiosInstance.delete(`/battle-box/${gameId}`);
};

export const getMyBattleBoxGamesApi = async () => {
  const res = await axiosInstance.get('/battle-box/me');
  return res.data;
};

export const getAdminBattleBoxGamesApi = async (
  limit = 50,
  offset = 0,
  userId?: string,
): Promise<AdminBattleBoxGame[]> => {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (userId) params.append('userId', userId);
  const res = await axiosInstance.get(`/battle-box/admin/games?${params}`);
  return res.data;
};