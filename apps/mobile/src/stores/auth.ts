import { create } from 'zustand';
import { tokenStorage } from '../lib/secure-storage';
import { meApi } from '../api/endpoints';
import type { UserRole } from '../api/types';

export interface User {
  id: string;
  phone: string;
  role: UserRole;
  status: string;
  countryCode?: string;
}

interface AuthState {
  user: User | null;
  hydrated: boolean;
  setUser: (u: User | null) => void;
  setTokens: (access: string, refresh: string) => Promise<void>;
  signOut: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  hydrated: false,
  setUser: (user) => set({ user }),
  setTokens: async (access, refresh) => {
    await tokenStorage.setTokens(access, refresh);
  },
  signOut: async () => {
    await tokenStorage.clear();
    set({ user: null });
  },
  hydrate: async () => {
    try {
      const access = await tokenStorage.getAccess();
      if (!access) {
        set({ hydrated: true, user: null });
        return;
      }
      const me = await meApi.get();
      set({
        hydrated: true,
        user: {
          id: me.id,
          phone: me.phone,
          role: me.role,
          status: me.status,
          countryCode: me.countryCode ?? undefined,
        },
      });
    } catch {
      await tokenStorage.clear();
      set({ hydrated: true, user: null });
    }
  },
}));
