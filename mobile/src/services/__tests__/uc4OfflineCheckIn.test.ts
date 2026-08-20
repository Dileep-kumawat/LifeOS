import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock React Native and Expo runtime modules
vi.mock("react-native", () => ({
  Platform: { OS: "ios", Version: "17.0" },
  AppState: {
    addEventListener: vi.fn().mockReturnValue({ remove: vi.fn() })
  },
  View: "View",
  Text: "Text",
  StyleSheet: { create: (styles: any) => styles }
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

import { habitRepo } from "../../db/repositories/habitRepo";
import { syncEngine } from "../syncEngine";
import { apiClient } from "../apiClient";
import { useAuthStore } from "../../store/authStore";
import { useSyncStore } from "../../store/syncStore";
import { getDatabase } from "../../db/database";
import type { LocalHabitCheckIn } from "../../db/schema";

vi.mock("../apiClient", () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
    delete: vi.fn()
  },
  refreshAccessToken: vi.fn().mockResolvedValue("mock_valid_token")
}));

describe("UC-4 End-to-End Test Case: Offline Habit Check-In & Sync Resolution", () => {
  const testUserId = "user_uc4_test";
  const testHabitId = "habit_uc4_water";
  const todayStr = "2026-08-17";

  beforeEach(async () => {
    vi.clearAllMocks();
    useAuthStore.setState({
      isAuthenticated: true,
      accessToken: "mock_jwt_token",
      user: {
        id: testUserId,
        email: "alex@lifeos.test",
        name: "Alex",
        role: "user",
        status: "active",
        emailVerified: true,
        createdAt: new Date().toISOString()
      }
    });

    const db = await getDatabase();
    await db.runAsync("DELETE FROM habits WHERE userId = ?;", testUserId);
    await db.runAsync("DELETE FROM habit_check_ins WHERE userId = ?;", testUserId);
    await db.runAsync("DELETE FROM sync_conflicts WHERE entityId = ?;", testHabitId);

    // Seed habit
    await habitRepo.createHabit({
      id: testHabitId,
      userId: testUserId,
      title: "Drink 2L Water",
      frequency: JSON.stringify({ type: "daily" }),
      reminderTime: "09:00",
      reminderEnabled: 1,
      currentStreak: 0,
      longestStreak: 0,
      completionRate: 0,
      lastCheckInDate: null
    });

    // Mark synced initially
    await db.runAsync("UPDATE habits SET syncStatus = 'synced' WHERE id = ?;", testHabitId);
  });

  it("completes full UC-4 flow: offline check-in -> pending state -> reconnect -> server push -> synced", async () => {
    const db = await getDatabase();

    // Step 1: Simulate user going into airplane mode (offline)
    useSyncStore.getState().setIsOnline(false);
    expect(useSyncStore.getState().isOnline).toBe(false);

    // Step 2: Mark habit complete offline (fast 1-tap check-in)
    const {
      habit: updatedHabit,
      isCheckedIn,
      checkIn
    } = await habitRepo.toggleCheckIn(testHabitId, testUserId, todayStr);

    // Step 3: Verify local optimistic state
    expect(isCheckedIn).toBe(true);
    expect(checkIn).toBeDefined();
    expect(checkIn?.syncStatus).toBe("pending"); // Local-first pending flag set!
    expect(updatedHabit?.currentStreak).toBe(1); // Optimistic streak updated
    expect(updatedHabit?.lastCheckInDate).toBe(todayStr);

    // Verify record in SQLite table
    const storedCheckIn = await db.getFirstAsync<LocalHabitCheckIn>(
      "SELECT * FROM habit_check_ins WHERE habitId = ? AND date = ?;",
      testHabitId,
      todayStr
    );
    expect(storedCheckIn).toBeDefined();
    expect(storedCheckIn?.syncStatus).toBe("pending");

    // Check count of pending mutations
    const pendingCount = await syncEngine.countPendingRecords();
    expect(pendingCount).toBeGreaterThanOrEqual(1);

    // Step 4: Reconnect to network
    useSyncStore.getState().setIsOnline(true);
    expect(useSyncStore.getState().isOnline).toBe(true);

    // Mock server push response acknowledging the mutation
    vi.mocked(apiClient.post).mockImplementation(async (url: string) => {
      if (url === "/sync/push") {
        return {
          data: {
            cursor: "cursor_uc4_synced_100",
            results: [
              {
                id: storedCheckIn!.id,
                module: "habit_check_ins",
                status: "applied"
              },
              {
                id: testHabitId,
                module: "habits",
                status: "applied"
              }
            ]
          }
        } as any;
      }
      if (url === "/sync/pull") {
        return {
          data: {
            cursor: "cursor_uc4_synced_100",
            changes: {}
          }
        } as any;
      }
      return { data: {} } as any;
    });

    // Step 5: Run syncEngine
    const syncSuccess = await syncEngine.syncNow();
    expect(syncSuccess).toBe(true);

    // Step 6: Verify records in SQLite are now 'synced'
    const syncedCheckIn = await db.getFirstAsync<LocalHabitCheckIn>(
      "SELECT * FROM habit_check_ins WHERE id = ?;",
      storedCheckIn!.id
    );
    expect(syncedCheckIn?.syncStatus).toBe("synced");

    const finalPending = await syncEngine.countPendingRecords();
    expect(finalPending).toBe(0);
    expect(useSyncStore.getState().status).toBe("synced");
  });

  it("handles conflict resolution properly if habit note/data was concurrently modified on another device", async () => {
    useSyncStore.getState().setIsOnline(true);

    // Update habit locally while offline
    await habitRepo.updateHabit(testHabitId, { title: "Drink 3L Water (Local)" });

    // Mock server push returning a conflict
    vi.mocked(apiClient.post).mockImplementation(async (url: string) => {
      if (url === "/sync/push") {
        return {
          data: {
            cursor: "cursor_conflict_1",
            results: [
              {
                id: testHabitId,
                module: "habits",
                status: "conflict",
                conflictingFields: ["title"],
                serverRecord: {
                  id: testHabitId,
                  title: "Drink 2.5L Water (Remote Server)",
                  frequency: JSON.stringify({ type: "daily" })
                }
              }
            ]
          }
        } as any;
      }
      if (url === "/sync/pull") {
        return {
          data: {
            cursor: "cursor_conflict_1",
            changes: {}
          }
        } as any;
      }
      if (url === "/sync/resolve-conflict") {
        return { data: { success: true } } as any;
      }
      return { data: {} } as any;
    });

    await syncEngine.syncNow();

    // Verify conflict stored in sync_conflicts table
    const conflicts = await syncEngine.loadConflicts();
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].entityId).toBe(testHabitId);

    // Resolve conflict by keeping local version
    const resolved = await syncEngine.resolveConflict(testHabitId, "keep_local");
    expect(resolved).toBe(true);

    // Verify conflict cleared
    const remainingConflicts = await syncEngine.loadConflicts();
    expect(remainingConflicts.length).toBe(0);
  });
});
