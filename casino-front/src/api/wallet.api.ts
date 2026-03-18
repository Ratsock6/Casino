import axiosInstance from '../utils/axios.instance';

interface WalletResponse {
  id: string;
  userId: string;
  balance: string;
  createdAt: string;
  updatedAt: string;
}

export const getWalletApi = async (): Promise<WalletResponse> => {
  const response = await axiosInstance.get<WalletResponse>('/wallet/me');
  return response.data;
};