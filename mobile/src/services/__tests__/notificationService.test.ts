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

vi.mock("expo-secure-store", () => {
  const store: Record<string, string> = {};
  return {
    AFTER_FIRST_UNLOCK: 1,
    setItemAsync: vi.fn(async (key: string, val: string) => {
      store[key] = val;
    }),
    getItemAsync: vi.fn(async (key: string) => store[key] ?? null),
    deleteItemAsync: vi.fn(async (key: string) => {
      delete store[key];
    })
  };
});

import { notificationService } from "../notificationService";
import { apiClient } from "../apiClient";
import { eventRepo } from "../../db/repositories/eventRepo";
import { habitRepo } from "../../db/repositories/habitRepo";
import { useAuthStore } from "../../store/authStore";

vi.mock("../apiClient", () => ({
  apiClient: {
    post: vi.fn().mockResolvedValue({ data: { subscription: { id: "sub_1" } } }),
    delete: vi.fn().mockResolvedValue({ data: { deleted: 1 } })
  }
}));

describe("Mobile Notification Service (FR-13.5: FCM & Notifee)", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await notificationService.cancelAllScheduledLocalNotifications();
    useAuthStore.setState({
      isAuthenticated: true,
      user: {
        id: "user_test_123",
        email: "alex@lifeos.test",
        name: "Alex User",
        role: "user",
        status: "active",
        emailVerified: true,
        createdAt: new Date().toISOString()
      }
    });
  });

  it("registers FCM device token with backend endpoint", async () => {
    const token = await notificationService.registerDeviceToken("fcm_mock_token_abc");

    expect(token).toBe("fcm_mock_token_abc");
    expect(apiClient.post).toHaveBeenCalledWith(
      "/notifications/fcm-token",
      expect.objectContaining({
        token: "fcm_mock_token_abc"
      })
    );
  });

  it("unregisters FCM device token upon logout and clears scheduled local triggers", async () => {
    await notificationService.registerDeviceToken("fcm_mock_token_abc");
    await notificationService.scheduleLocalNotification({
      id: "test_trigger_1",
      entityId: "evt_1",
      type: "calendar_reminder",
      title: "Test Event",
      body: "Reminder",
      triggerTimestamp: Date.now() + 60000
    });

    expect(notificationService.getScheduledNotifications().length).toBe(1);

    await notificationService.unregisterDeviceToken();

    expect(apiClient.delete).toHaveBeenCalledWith(
      "/notifications/fcm-token",
      expect.objectContaining({
        data: { token: "fcm_mock_token_abc" }
      })
    );
    expect(notificationService.getScheduledNotifications().length).toBe(0);
  });

  it("deduplicates notifications when server push and local trigger fire for the same reminder", () => {
    const reminderId = "rem_event_meeting_123";

    // First arrival (e.g. from local Notifee trigger) -> allowed
    const firstDecision = notificationService.shouldDeliverNotification(reminderId);
    expect(firstDecision).toBe(true);

    // Second arrival (e.g. from FCM server push shortly after) -> suppressed as duplicate
    const secondDecision = notificationService.shouldDeliverNotification(reminderId);
    expect(secondDecision).toBe(false);
  });

  it("schedules local offline notifications from SQLite events and habits", async () => {
    const now = Date.now();
    const futureEventStart = new Date(now + 30 * 60 * 1000).toISOString(); // 30 mins in future

    vi.spyOn(eventRepo, "listEvents").mockResolvedValueOnce([
      {
        id: "evt_future_1",
        userId: "user_test_123",
        title: "Sprint Planning",
        description: "",
        location: "",
        startTime: futureEventStart,
        endTime: new Date(now + 60 * 60 * 1000).toISOString(),
        timezone: "UTC",
        isAllDay: 0,
        recurrenceRule: null,
        recurrenceEndDate: null,
        exceptions: "[]",
        reminderLeadMinutes: 15,
        reminderJobId: null,
        isOverride: 0,
        parentEventId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: "synced",
        lastModifiedAt: now
      }
    ]);

    vi.spyOn(habitRepo, "listHabits").mockResolvedValueOnce([
      {
        id: "habit_daily_1",
        userId: "user_test_123",
        title: "Evening Reading",
        frequency: JSON.stringify({ type: "daily" }),
        reminderTime: "21:00",
        reminderEnabled: 1,
        currentStreak: 5,
        longestStreak: 10,
        completionRate: 0.8,
        lastCheckInDate: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: "synced",
        lastModifiedAt: now
      }
    ]);

    await notificationService.rescheduleAllLocalNotifications("user_test_123");

    const scheduled = notificationService.getScheduledNotifications();
    expect(scheduled.length).toBe(2);

    const eventSchedule = scheduled.find((s) => s.entityId === "evt_future_1");
    expect(eventSchedule).toBeDefined();
    expect(eventSchedule?.title).toContain("Sprint Planning");
    expect(eventSchedule?.type).toBe("calendar_reminder");

    const habitSchedule = scheduled.find((s) => s.entityId === "habit_daily_1");
    expect(habitSchedule).toBeDefined();
    expect(habitSchedule?.title).toContain("Evening Reading");
    expect(habitSchedule?.type).toBe("habit_reminder");
  });
});
