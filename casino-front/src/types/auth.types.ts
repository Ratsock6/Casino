export interface User {
  id: string;
  username: string;
  phoneNumber: string;
  role: 'PLAYER' | 'VIP' | 'ADMIN' | 'SUPER_ADMIN';
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}
