import { create } from 'zustand';
import { tokenStorage } from '../lib/secure-storage';
import { meApi, candidateProfileApi } from '../api/endpoints';
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
  needsOnboarding: boolean;
  setUser: (u: User | null) => void;
  setTokens: (access: string, refresh: string) => Promise<void>;
  refreshOnboardingStatus: () => Promise<void>;
  signOut: () => Promise<void>;
  hydrate: () => Promise<void>;
}

async function computeNeedsOnboarding(role: UserRole): Promise<boolean> {
  if (role !== 'candidate') return false;
  try {
    const domains = await candidateProfileApi.getDomains();
    return domains.length < 3;
  } catch {
    return true;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  hydrated: false,
  needsOnboarding: false,

  setUser: (user) => set({ user }),

  setTokens: async (access, refresh) => {
    await tokenStorage.setTokens(access, refresh);
  },

  refreshOnboardingStatus: async () => {
    const u = get().user;
    if (!u) return;
    const needs = await computeNeedsOnboarding(u.role);
    set({ needsOnboarding: needs });
  },

  signOut: async () => {
    await tokenStorage.clear();
    set({ user: null, needsOnboarding: false });
  },

  hydrate: async () => {
    try {
      const access = await tokenStorage.getAccess();
      if (!access) {
        set({ hydrated: true, user: null, needsOnboarding: false });
        return;
      }
      const me = await meApi.get();
      const user: User = {
        id: me.id,
        phone: me.phone,
        role: me.role,
        status: me.status,
        countryCode: me.countryCode ?? undefined,
      };
      const needs = await computeNeedsOnboarding(me.role);
      set({ hydrated: true, user, needsOnboarding: needs });
    } catch {
      await tokenStorage.clear();
      set({ hydrated: true, user: null, needsOnboarding: false });
    }
  },
}));
