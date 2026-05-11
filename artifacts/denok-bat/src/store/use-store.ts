import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile } from '@workspace/api-client-react';

export type Language = 'es' | 'eu';

export type AppUser = UserProfile & {
  roles?: string[];
};

interface AppState {
  lang: Language;
  setLang: (lang: Language) => void;
  user: AppUser | null;
  setUser: (user: AppUser | null) => void;
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
      version: 2,
      migrate: (persistedState: unknown) => {
        if (!persistedState || typeof persistedState !== 'object') {
          return persistedState as AppState;
        }
        return {
          ...(persistedState as AppState),
          isDemoMode: false,
        };
      },
      partialize: (state) => ({
        lang: state.lang,
        user: state.user,
        token: state.token,
      }),
    }
  )
);

export function getUserRoles(user: AppUser): string[] {
  if (user.roles && user.roles.length > 0) return user.roles;
  return [user.role];
}

export function userHasRole(user: AppUser, role: string | string[]): boolean {
  const userRoles = getUserRoles(user);
  if (Array.isArray(role)) return role.some(r => userRoles.includes(r));
  return userRoles.includes(role);
}
