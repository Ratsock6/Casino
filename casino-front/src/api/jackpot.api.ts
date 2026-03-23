import axiosInstance from '../utils/axios.instance';

export interface JackpotData {
  amount: number;
  lastWonAt: string | null;
  lastWonAmount: number;
}

export interface JackpotHistoryEntry {
  username: string;
  firstName: string;
  lastName: string;
  amount: number;
  gameType: string;
  createdAt: string;
}

export const getJackpotApi = async (): Promise<JackpotData> => {
  const res = await axiosInstance.get('/jackpot');
  return res.data;
};

export const getJackpotHistoryApi = async (): Promise<JackpotHistoryEntry[]> => {
  const res = await axiosInstance.get('/jackpot/history');
  return res.data;
};

export const resetJackpotApi = async (): Promise<void> => {
  await axiosInstance.post('/jackpot/reset');
};