import axiosInstance from '../utils/axios.instance';

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  role: string;
  content: string;
  createdAt: string;
}

export const getChatMessagesApi = async (): Promise<ChatMessage[]> => {
  const res = await axiosInstance.get<ChatMessage[]>('/chat/messages');
  return res.data;
};
