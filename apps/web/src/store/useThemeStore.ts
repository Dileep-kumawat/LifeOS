import { create } from 'zustand';

export type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeState {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: (localStorage.getItem('lifeos_theme') as ThemeMode) || 'dark',
  setTheme: (theme) => {
    localStorage.setItem('lifeos_theme', theme);
    set({ theme });
    applyThemeToHtml(theme);
  },
  toggleTheme: () => {
    set((state) => {
      const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('lifeos_theme', nextTheme);
      applyThemeToHtml(nextTheme);
      return { theme: nextTheme };
    });
  },
}));

function applyThemeToHtml(theme: ThemeMode) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else if (theme === 'light') {
    root.classList.remove('dark');
  } else {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDark) root.classList.add('dark');
    else root.classList.remove('dark');
  }
}
