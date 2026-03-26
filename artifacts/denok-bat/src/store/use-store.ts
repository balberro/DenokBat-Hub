import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile } from '@workspace/api-client-react';

export type Language = 'es' | 'eu';

interface AppState {
  lang: Language;
  setLang: (lang: Language) => void;
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
  isDemoMode: boolean;
  setDemoMode: (isDemo: boolean) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      lang: 'eu', // Default to Euskara
      setLang: (lang) => set({ lang }),
      user: null,
      setUser: (user) => set({ user }),
      isDemoMode: false,
      setDemoMode: (isDemoMode) => set({ isDemoMode }),
    }),
    {
      name: 'denok-bat-storage',
    }
  )
);
