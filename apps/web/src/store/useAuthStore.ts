import { create } from 'zustand';
import { IUser } from '@lifeos/shared';

interface AuthState {
  user: IUser | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: IUser, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('lifeos_access_token'),
  isAuthenticated: !!localStorage.getItem('lifeos_access_token'),
  setAuth: (user, token) => {
    localStorage.setItem('lifeos_access_token', token);
    set({ user, token, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('lifeos_access_token');
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
