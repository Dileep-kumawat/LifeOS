import { create } from "zustand";

// Skeleton store for Phase 0. Real slices (auth session, calendar filters,
// active habit view, etc.) get added feature-by-feature from Phase 1 on —
// keep this small and split into multiple stores per domain rather than
// growing one giant store.
interface AppState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen }))
}));
