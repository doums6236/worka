'use client';

import { create } from 'zustand';
import { tokens } from './api';
import { meApi, type MeResponse } from './endpoints';

interface AuthState {
  user: MeResponse | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setUser: (u: MeResponse | null) => void;
  signOut: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  hydrated: false,
  setUser: (u) => set({ user: u }),
  signOut: () => {
    tokens.clear();
    set({ user: null });
  },
  hydrate: async () => {
    if (!tokens.getAccess()) {
      set({ hydrated: true, user: null });
      return;
    }
    try {
      const me = await meApi.get();
      set({ hydrated: true, user: me });
    } catch {
      tokens.clear();
      set({ hydrated: true, user: null });
    }
  },
}));
