import { create } from 'zustand';

export type QuickActionType = 'task' | 'note' | 'project' | 'goal' | 'habit' | 'journal' | 'event' | 'expense' | 'capture';

interface DashboardState {
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  quickCaptureOpen: boolean;
  quickCaptureType: QuickActionType | null;
  openQuickCapture: (type: QuickActionType) => void;
  closeQuickCapture: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  quickCaptureOpen: false,
  quickCaptureType: null,
  openQuickCapture: (type) => set({ quickCaptureOpen: true, quickCaptureType: type }),
  closeQuickCapture: () => set({ quickCaptureOpen: false, quickCaptureType: null }),
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
}));
