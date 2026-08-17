import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock React Native and Expo runtime modules
vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
  AppState: {
    addEventListener: vi.fn().mockReturnValue({ remove: vi.fn() })
  }
}));

vi.mock("expo-constants", () => ({
  default: { expoConfig: null }
}));

vi.mock("expo-secure-store", () => ({
  AFTER_FIRST_UNLOCK: 1,
  getItemAsync: vi.fn().mockResolvedValue(null),
  setItemAsync: vi.fn().mockResolvedValue(undefined),
  deleteItemAsync: vi.fn().mockResolvedValue(undefined)
}));


import { syncEngine } from "../syncEngine";
import { noteRepo } from "../../db/repositories/noteRepo";
import { habitRepo } from "../../db/repositories/habitRepo";
import { financeRepo } from "../../db/repositories/financeRepo";
import { getDatabase, resetDatabaseForTests } from "../../db/database";
import { useAuthStore } from "../../store/authStore";
import { useSyncStore } from "../../store/syncStore";
import { apiClient, refreshAccessToken } from "../apiClient";

vi.mock("../apiClient", () => ({
  apiClient: {
    post: vi.fn()
  },
  refreshAccessToken: vi.fn(),
  tokenStorage: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined)
  }
}));

const mockUser = {
  id: "user-123",
  email: "test@example.com",
  name: "Test",
  role: "user" as const,
  status: "active" as const,
  emailVerified: true,
  createdAt: new Date().toISOString()
};

describe("Mobile Offline-First Local Repositories", () => {
  const userId = "user-123";

  beforeEach(async () => {
    await resetDatabaseForTests();
    useAuthStore.getState().setAuth(mockUser, "mock-token");
    useSyncStore.getState().reset();
    vi.clearAllMocks();
  });

  it("writes locally with syncStatus='pending' when offline (airplane mode)", async () => {
    // Simulate airplane mode / offline
    useSyncStore.getState().setIsOnline(false);

    const createdNote = await noteRepo.createNote({
      userId,
      title: "Offline Idea",
      content: '{"type":"doc"}',
      contentText: "Offline Idea text",
      folderId: null,
      tags: "[]"
    });

    expect(createdNote.id).toBeDefined();
    expect(createdNote.syncStatus).toBe("pending");
    expect(createdNote.lastModifiedAt).toBeGreaterThan(0);

    const pendingCount = await syncEngine.countPendingRecords();
    expect(pendingCount).toBeGreaterThanOrEqual(1);

    // Verify syncNow respects offline mode without crashing
    const synced = await syncEngine.syncNow();
    expect(synced).toBe(false);
    expect(useSyncStore.getState().status).toBe("offline");

    // Ensure note is still preserved as pending
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>("SELECT * FROM notes WHERE id = ?;", createdNote.id);
    expect(rows).toHaveLength(1);
    expect(rows[0].syncStatus).toBe("pending");
  });
});

describe("Mobile Sync Engine - Push & Pull Lifecycle", () => {
  const userId = "user-123";

  beforeEach(async () => {
    await resetDatabaseForTests();
    useAuthStore.getState().setAuth(mockUser, "valid-token");
    useSyncStore.getState().reset();
    useSyncStore.getState().setIsOnline(true);
    vi.clearAllMocks();
  });

  it("pushes pending changes, marks them synced, and merges pulled remote changes", async () => {
    // 1. Create a local pending habit
    const localHabit = await habitRepo.createHabit({
      userId,
      title: "Daily Meditation",
      frequency: '{"type":"daily"}',
      reminderTime: "07:00",
      reminderEnabled: 1,
      currentStreak: 0,
      longestStreak: 0,
      completionRate: 0,
      lastCheckInDate: null
    });

    expect(localHabit.syncStatus).toBe("pending");

    // 2. Mock /sync/push response confirming applied
    (apiClient.post as any).mockImplementation((url: string) => {
      if (url === "/sync/push") {
        return Promise.resolve({
          data: {
            cursor: "2026-08-16T12:00:00.000Z",
            results: [
              {
                id: localHabit.id,
                module: "habits",
                status: "applied"
              }
            ]
          }
        });
      }
      if (url === "/sync/pull") {
        return Promise.resolve({
          data: {
            cursor: "2026-08-16T12:00:00.000Z",
            serverTime: "2026-08-16T12:00:00.000Z",
            changes: {
              habits: { upserted: [], deleted: [] },
              notes: {
                upserted: [
                  {
                    id: "server-note-456",
                    userId,
                    title: "Remote Note from Web",
                    content: '{"type":"doc"}',
                    contentText: "Remote Note from Web",
                    folderId: null,
                    tags: "[]",
                    updatedAt: "2026-08-16T11:59:00.000Z"
                  }
                ],
                deleted: []
              },
              transactions: { upserted: [], deleted: [] },
              events: { upserted: [], deleted: [] },
              goals: { upserted: [], deleted: [] },
              note_folders: { upserted: [], deleted: [] },
              budgets: { upserted: [], deleted: [] },
              categories: { upserted: [], deleted: [] },
              habit_check_ins: { upserted: [], deleted: [] },
              note_versions: { upserted: [], deleted: [] }
            }
          }
        });
      }
      return Promise.reject(new Error("Unhandled route"));
    });

    // 3. Run syncNow
    const success = await syncEngine.syncNow();
    expect(success).toBe(true);

    // 4. Verify local habit is now marked "synced"
    const db = await getDatabase();
    const habitRows = await db.getAllAsync<any>("SELECT * FROM habits WHERE id = ?;", localHabit.id);
    expect(habitRows[0].syncStatus).toBe("synced");

    // 5. Verify pulled remote note was merged into SQLite with syncStatus="synced"
    const noteRows = await db.getAllAsync<any>("SELECT * FROM notes WHERE id = ?;", "server-note-456");
    expect(noteRows).toHaveLength(1);
    expect(noteRows[0].title).toBe("Remote Note from Web");
    expect(noteRows[0].syncStatus).toBe("synced");

    // 6. Verify sync store state
    expect(useSyncStore.getState().status).toBe("synced");
    expect(useSyncStore.getState().pendingCount).toBe(0);
    expect(useSyncStore.getState().lastSyncedAt).toBeGreaterThan(0);
  });

  it("handles auth token expiration by refreshing before sync", async () => {
    // Simulate expired access token
    useAuthStore.getState().setAuth(mockUser, "");

    // Mock successful refresh
    (refreshAccessToken as any).mockResolvedValue("new-refreshed-token");

    (apiClient.post as any).mockImplementation((url: string) => {
      if (url === "/sync/push") {
        return Promise.resolve({ data: { cursor: "123", results: [] } });
      }
      if (url === "/sync/pull") {
        return Promise.resolve({ data: { cursor: "123", serverTime: "123", changes: {} } });
      }
      return Promise.resolve({ data: {} });
    });

    const success = await syncEngine.syncNow();

    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(success).toBe(true);
  });

  it("preserves pending SQLite records when refresh token expires", async () => {
    // Create pending local transaction
    const tx = await financeRepo.createTransaction({
      userId,
      amount: 45.0,
      type: "expense",
      category: "Coffee",
      date: "2026-08-16",
      note: "Offline mocha",
      receiptAttachment: null
    });

    // Simulate access token missing & refresh token expired (returns null)
    useAuthStore.getState().setAuth(mockUser, "");
    (refreshAccessToken as any).mockResolvedValue(null);

    const success = await syncEngine.syncNow();

    expect(success).toBe(false);
    expect(useSyncStore.getState().status).toBe("error");

    // Crucial check: pending transaction MUST NOT be deleted
    const db = await getDatabase();
    const txRows = await db.getAllAsync<any>("SELECT * FROM transactions WHERE id = ?;", tx.id);
    expect(txRows).toHaveLength(1);
    expect(txRows[0].syncStatus).toBe("pending");
    expect(txRows[0].note).toBe("Offline mocha");
  });
});
