import { create } from "zustand";

type UserRole = "PLAYER" | "VIP" | "ADMIN" | "SUPER_ADMIN";

interface AuthUser {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  balance?: string;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  setSession: (payload: { accessToken: string; user: AuthUser }) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  setSession: ({ accessToken, user }) => set({ accessToken, user }),
  clearSession: () => set({ accessToken: null, user: null }),
}));