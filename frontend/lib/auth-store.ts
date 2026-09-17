import { create } from 'zustand';
import type { User } from '@/types';

interface AuthState {
  accessToken: string | null;
  user: User | null;
  hydrated: boolean;
  setAuth: (accessToken: string | null, user: User | null) => void;
  setHydrated: (hydrated: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  hydrated: false,
  setAuth: (accessToken, user) => set({ accessToken, user }),
  setHydrated: (hydrated) => set({ hydrated }),
  clear: () => set({ accessToken: null, user: null }),
}));
