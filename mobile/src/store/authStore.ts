import { create } from "zustand";
import type { UserProfile } from "@lifeos/shared";

interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  setAuth: (user: UserProfile, accessToken: string) => void;
  setUser: (user: UserProfile) => void;
  setAccessToken: (token: string) => void;
  clearAuth: () => void;
  setIsInitializing: (initializing: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isInitializing: true,

  setAuth: (user, accessToken) =>
    set({
      user,
      accessToken,
      isAuthenticated: true,
      isInitializing: false
    }),

  setUser: (user) => set({ user }),

  setAccessToken: (accessToken) =>
    set({
      accessToken,
      isAuthenticated: !!accessToken,
      isInitializing: false
    }),

  clearAuth: () =>
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isInitializing: false
    }),

  setIsInitializing: (isInitializing) => set({ isInitializing })
}));
