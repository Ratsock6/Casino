import { create } from 'zustand';

interface WalletState {
  balance: number;
  setBalance: (balance: number) => void;
  decreaseBalance: (amount: number) => void;
  increaseBalance: (amount: number) => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  balance: 0,

  setBalance: (balance) => set({ balance }),

  decreaseBalance: (amount) =>
    set((state) => ({ balance: state.balance - amount })),

  increaseBalance: (amount) =>
    set((state) => ({ balance: state.balance + amount })),
}));