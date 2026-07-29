import { create } from 'zustand';
import { IUser, LoginInput, RegisterInput } from '@lifeos/shared';
import { authApi } from '../api/auth.api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

interface AuthState {
  user: IUser | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  error: string | null;

  login: (data: LoginInput) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setAuthFromOAuth: (token: string, refreshToken: string) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('lifeos_access_token'),
  refreshToken: localStorage.getItem('lifeos_refresh_token'),
  isAuthenticated: !!localStorage.getItem('lifeos_access_token'),
  isLoading: false,
  isInitializing: true,
  error: null,

  clearError: () => set({ error: null }),

  login: async (data: LoginInput) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login(data);
      if (response.success && response.data) {
        const { user, tokens } = response.data;
        localStorage.setItem('lifeos_access_token', tokens.accessToken);
        localStorage.setItem('lifeos_refresh_token', tokens.refreshToken);
        set({
          user,
          token: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Login failed';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  register: async (data: RegisterInput) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.register(data);
      if (response.success && response.data) {
        const { user, tokens } = response.data;
        localStorage.setItem('lifeos_access_token', tokens.accessToken);
        localStorage.setItem('lifeos_refresh_token', tokens.refreshToken);
        set({
          user,
          token: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Registration failed';
      set({ error: msg, isLoading: false });
      throw new Error(msg);
    }
  },

  setAuthFromOAuth: async (token: string, refreshToken: string) => {
    set({ isLoading: true, error: null });
    try {
      localStorage.setItem('lifeos_access_token', token);
      localStorage.setItem('lifeos_refresh_token', refreshToken);
      set({
        token,
        refreshToken,
        isAuthenticated: true,
        isLoading: false,
      });

      // Fetch user profile from /me after setting tokens
      const response = await authApi.getMe();
      if (response.success && response.data) {
        set({ user: response.data });
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'OAuth login failed';
      localStorage.removeItem('lifeos_access_token');
      localStorage.removeItem('lifeos_refresh_token');
      set({ error: msg, isLoading: false, isAuthenticated: false, token: null, refreshToken: null });
      throw new Error(msg);
    }
  },

  logout: async () => {
    const refreshToken = get().refreshToken;
    try {
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('lifeos_access_token');
      localStorage.removeItem('lifeos_refresh_token');
      set({
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  checkAuth: async () => {
    const token = localStorage.getItem('lifeos_access_token');
    if (!token) {
      set({ isInitializing: false, isAuthenticated: false, user: null });
      return;
    }

    try {
      const response = await authApi.getMe();
      if (response.success && response.data) {
        set({
          user: response.data,
          isAuthenticated: true,
          isInitializing: false,
        });
      } else {
        throw new Error('Failed to validate session');
      }
    } catch {
      localStorage.removeItem('lifeos_access_token');
      localStorage.removeItem('lifeos_refresh_token');
      set({
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isInitializing: false,
      });
    }
  },
}));
