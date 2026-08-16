import { create } from "zustand";

export type SyncStateStatus = "idle" | "synced" | "syncing" | "pending" | "offline" | "error";

interface SyncState {
  status: SyncStateStatus;
  pendingCount: number;
  lastSyncedAt: number | null;
  lastError: string | null;
  isOnline: boolean;

  setSyncStatus: (status: SyncStateStatus) => void;
  setPendingCount: (count: number) => void;
  setLastSyncedAt: (timestamp: number) => void;
  setLastError: (error: string | null) => void;
  setIsOnline: (online: boolean) => void;
  reset: () => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  status: "idle",
  pendingCount: 0,
  lastSyncedAt: null,
  lastError: null,
  isOnline: true,

  setSyncStatus: (status) => set({ status }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
  setLastError: (lastError) => set({ lastError }),
  setIsOnline: (isOnline) => set({ isOnline, status: isOnline ? "synced" : "offline" }),
  reset: () =>
    set({
      status: "idle",
      pendingCount: 0,
      lastSyncedAt: null,
      lastError: null,
      isOnline: true
    })
}));
