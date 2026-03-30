import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile } from '@workspace/api-client-react';

export type Language = 'es' | 'eu';

interface AppState {
  lang: Language;
  setLang: (lang: Language) => void;
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
  token: string | null;
  setToken: (token: string | null) => void;
  isDemoMode: boolean;
  setDemoMode: (isDemo: boolean) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      lang: 'eu',
      setLang: (lang) => set({ lang }),
      user: null,
      setUser: (user) => set({ user }),
      token: null,
      setToken: (token) => set({ token }),
      isDemoMode: false,
      setDemoMode: (isDemoMode) => set({ isDemoMode }),
    }),
    {
      name: 'denok-bat-storage',
    }
  )
);
