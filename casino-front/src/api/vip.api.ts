import axiosInstance from '../utils/axios.instance';

export interface VipPrice {
  duration: string;
  label: string;
  price: number;
  originalPrice: number | null;
}

export interface VipStatus {
  isVip: boolean;
  role: string;
  subscription: {
    duration: string;
    startedAt: string;
    expiresAt: string | null;
    isLifetime: boolean;
    daysLeft: number | null;
  } | null;
}

export const getVipPricesApi = async (): Promise<VipPrice[]> => {
  const res = await axiosInstance.get('/vip/prices');
  return res.data;
};

export const getVipStatusApi = async (): Promise<VipStatus> => {
  const res = await axiosInstance.get('/vip/status');
  return res.data;
};

export const buyVipApi = async (duration: string): Promise<{
  message: string;
  expiresAt: string | null;
  price: number;
  newBalance: number;
}> => {
  const res = await axiosInstance.post('/vip/buy', { duration });
  return res.data;
};
