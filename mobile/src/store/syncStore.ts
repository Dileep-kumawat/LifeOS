import { create } from "zustand";
import type { LocalSyncConflict } from "../db/schema";

export type SyncStateStatus = "idle" | "synced" | "syncing" | "pending" | "offline" | "error";

interface SyncState {
  status: SyncStateStatus;
  pendingCount: number;
  lastSyncedAt: number | null;
  lastError: string | null;
  isOnline: boolean;

  // Conflict management
  conflicts: LocalSyncConflict[];
  conflictNotices: string[];

  setSyncStatus: (status: SyncStateStatus) => void;
  setPendingCount: (count: number) => void;
  setLastSyncedAt: (timestamp: number) => void;
  setLastError: (error: string | null) => void;
  setIsOnline: (online: boolean) => void;

  setConflicts: (conflicts: LocalSyncConflict[]) => void;
  addConflict: (conflict: LocalSyncConflict) => void;
  removeConflict: (conflictId: string) => void;
  addConflictNotice: (notice: string) => void;
  dismissNotice: (index: number) => void;
  clearNotices: () => void;
  reset: () => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  status: "idle",
  pendingCount: 0,
  lastSyncedAt: null,
  lastError: null,
  isOnline: true,
  conflicts: [],
  conflictNotices: [],

  setSyncStatus: (status) => set({ status }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
  setLastError: (lastError) => set({ lastError }),
  setIsOnline: (isOnline) => set({ isOnline, status: isOnline ? "synced" : "offline" }),

  setConflicts: (conflicts) => set({ conflicts }),
  addConflict: (conflict) =>
    set((state) => ({
      conflicts: [...state.conflicts.filter((c) => c.id !== conflict.id), conflict]
    })),
  removeConflict: (conflictId) =>
    set((state) => ({
      conflicts: state.conflicts.filter((c) => c.id !== conflictId && c.entityId !== conflictId)
    })),
  addConflictNotice: (notice) =>
    set((state) => ({
      conflictNotices: [...state.conflictNotices, notice]
    })),
  dismissNotice: (index) =>
    set((state) => ({
      conflictNotices: state.conflictNotices.filter((_, i) => i !== index)
    })),
  clearNotices: () => set({ conflictNotices: [] }),

  reset: () =>
    set({
      status: "idle",
      pendingCount: 0,
      lastSyncedAt: null,
      lastError: null,
      isOnline: true,
      conflicts: [],
      conflictNotices: []
    })
}));
