import axiosInstance from '../utils/axios.instance';
import type { LoginResponse } from '../types/auth.types';

export const loginApi = async (username: string, password: string): Promise<LoginResponse> => {
  const response = await axiosInstance.post<LoginResponse>('/auth/login', {
    username,
    password,
  });
  return response.data;
};

export interface RegisterPayload {
  username: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  phoneNumber: string;
  password: string;
}

export const registerApi = async (payload: RegisterPayload): Promise<void> => {
  await axiosInstance.post('/auth/register', payload);
};