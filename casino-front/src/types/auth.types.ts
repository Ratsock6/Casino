export interface User {
  id: string;
  username: string;
  phoneNumber: string;
  firstName: string;
  role: 'PLAYER' | 'VIP' | 'ADMIN' | 'SUPER_ADMIN';
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}
