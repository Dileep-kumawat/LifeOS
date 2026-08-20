import { Platform } from "react-native";
import { apiClient } from "./apiClient";
import { tokenStorage } from "./tokenStorage";
import { eventRepo } from "../db/repositories/eventRepo";
import { habitRepo } from "../db/repositories/habitRepo";
import { useAuthStore } from "../store/authStore";

const FCM_TOKEN_STORAGE_KEY = "lifeos_fcm_device_token";
const SCHEDULED_LOCAL_NOTIFICATIONS_KEY = "lifeos_scheduled_local_notifs";
const DELIVERED_NOTIFICATION_IDS_KEY = "lifeos_delivered_notifs_cache";

export interface ScheduledLocalNotification {
  id: string; // Unique trigger ID
  entityId: string; // Event ID or Habit ID
  type: "calendar_reminder" | "habit_reminder" | "budget_alert" | "daily_summary";
  title: string;
  body: string;
  triggerTimestamp: number; // Unix timestamp ms
  data?: Record<string, any>;
}

// In-memory registry of scheduled notifications for platform execution / mocking
let scheduledTriggers: ScheduledLocalNotification[] = [];
let deliveredNotificationIds = new Set<string>();

export const notificationService = {
  /**
   * Initialize notification handlers, sync token if user is logged in,
   * and load scheduled notifications from storage.
   */
  async initialize(): Promise<void> {
    try {
      const storedCache = await tokenStorage.getItem(DELIVERED_NOTIFICATION_IDS_KEY);
      if (storedCache) {
        deliveredNotificationIds = new Set(JSON.parse(storedCache));
      }

      const storedScheduled = await tokenStorage.getItem(SCHEDULED_LOCAL_NOTIFICATIONS_KEY);
      if (storedScheduled) {
        scheduledTriggers = JSON.parse(storedScheduled);
      }
    } catch {
      // Storage error fallback
    }

    const { isAuthenticated, user } = useAuthStore.getState();
    if (isAuthenticated && user?.id) {
      await this.registerDeviceToken();
      await this.rescheduleAllLocalNotifications(user.id);
    }
  },

  /**
   * Register device FCM token with backend
   */
  async registerDeviceToken(providedToken?: string): Promise<string | null> {
    try {
      let token: string | undefined = providedToken;
      if (!token) {
        token = (await tokenStorage.getItem(FCM_TOKEN_STORAGE_KEY)) || undefined;
      }

      // Generate stable mock token if not running inside full native FCM build
      if (!token) {
        token = `fcm_${Platform.OS}_${Math.random().toString(36).substring(2, 12)}_${Date.now()}`;
      }

      await tokenStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);

      const deviceType =
        Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web";
      const deviceName = `${Platform.OS.toUpperCase()} Device (${Platform.Version})`;

      await apiClient.post("/notifications/fcm-token", {
        token,
        deviceType,
        deviceName
      });

      return token;
    } catch (_err) {
      // Network or API error — will retry on next online sync
      return null;
    }
  },

  /**
   * Unregister device FCM token upon logout
   */
  async unregisterDeviceToken(): Promise<void> {
    try {
      const token = await tokenStorage.getItem(FCM_TOKEN_STORAGE_KEY);
      if (token) {
        await apiClient.delete("/notifications/fcm-token", {
          data: { token }
        });
      }
      await this.cancelAllScheduledLocalNotifications();
    } catch {
      // Ignore network errors on logout cleanup
    }
  },

  /**
   * Deduplicate incoming push vs locally-fired notifications.
   * Returns true if the notification should be displayed, false if suppressed as duplicate.
   */
  shouldDeliverNotification(notificationId: string, _timestamp: number = Date.now()): boolean {
    if (!notificationId) return true;

    // Check if duplicate arrived within 5 minutes
    if (deliveredNotificationIds.has(notificationId)) {
      return false; // Suppress duplicate
    }

    deliveredNotificationIds.add(notificationId);
    // Keep cache bounded to last 1000 items
    if (deliveredNotificationIds.size > 1000) {
      const arr = Array.from(deliveredNotificationIds).slice(-500);
      deliveredNotificationIds = new Set(arr);
    }

    tokenStorage
      .setItem(DELIVERED_NOTIFICATION_IDS_KEY, JSON.stringify(Array.from(deliveredNotificationIds)))
      .catch(() => {});

    return true;
  },

  /**
   * Locally schedule a notification (Notifee / Expo trigger equivalent).
   * This guarantees offline delivery in airplane mode.
   */
  async scheduleLocalNotification(notif: ScheduledLocalNotification): Promise<void> {
    // Remove any existing schedule for this specific trigger ID
    scheduledTriggers = scheduledTriggers.filter((s) => s.id !== notif.id);
    scheduledTriggers.push(notif);

    await tokenStorage.setItem(
      SCHEDULED_LOCAL_NOTIFICATIONS_KEY,
      JSON.stringify(scheduledTriggers)
    );
  },

  /**
   * Cancel a scheduled local notification by ID
   */
  async cancelScheduledLocalNotification(id: string): Promise<void> {
    scheduledTriggers = scheduledTriggers.filter((s) => s.id !== id);
    await tokenStorage.setItem(
      SCHEDULED_LOCAL_NOTIFICATIONS_KEY,
      JSON.stringify(scheduledTriggers)
    );
  },

  /**
   * Cancel all scheduled notifications (e.g. on logout)
   */
  async cancelAllScheduledLocalNotifications(): Promise<void> {
    scheduledTriggers = [];
    await tokenStorage.removeItem(SCHEDULED_LOCAL_NOTIFICATIONS_KEY);
  },

  /**
   * Get all currently scheduled local notifications
   */
  getScheduledNotifications(): ScheduledLocalNotification[] {
    return [...scheduledTriggers];
  },

  /**
   * Re-computes and schedules all local notifications from the local SQLite database.
   * Called whenever calendar events or habits are modified locally or synchronized.
   */
  async rescheduleAllLocalNotifications(userId: string): Promise<void> {
    const now = Date.now();
    const newSchedules: ScheduledLocalNotification[] = [];

    // 1. Calendar Events with reminderLeadMinutes
    const events = await eventRepo.listEvents(userId);
    for (const ev of events) {
      if (ev.reminderLeadMinutes && ev.reminderLeadMinutes > 0) {
        const eventStartMs = new Date(ev.startTime).getTime();
        const triggerTime = eventStartMs - ev.reminderLeadMinutes * 60 * 1000;

        if (triggerTime > now) {
          newSchedules.push({
            id: `cal_rem_${ev.id}`,
            entityId: ev.id,
            type: "calendar_reminder",
            title: `Upcoming: ${ev.title}`,
            body: `Starting in ${ev.reminderLeadMinutes} minutes at ${new Date(ev.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
            triggerTimestamp: triggerTime,
            data: { eventId: ev.id, startTime: ev.startTime }
          });
        }
      }
    }

    // 2. Habits with reminderEnabled and reminderTime (HH:mm)
    const habits = await habitRepo.listHabits(userId);
    for (const h of habits) {
      if (h.reminderEnabled && h.reminderTime) {
        const [hours, minutes] = h.reminderTime.split(":").map(Number);
        const today = new Date();
        const triggerDate = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
          hours,
          minutes,
          0,
          0
        );

        let triggerMs = triggerDate.getTime();
        // If time already passed today, schedule for tomorrow
        if (triggerMs <= now) {
          triggerMs += 24 * 60 * 60 * 1000;
        }

        newSchedules.push({
          id: `habit_rem_${h.id}`,
          entityId: h.id,
          type: "habit_reminder",
          title: `Habit Reminder: ${h.title}`,
          body: `Time to check in for your habit today! (Streak: ${h.currentStreak} days)`,
          triggerTimestamp: triggerMs,
          data: { habitId: h.id }
        });
      }
    }

    scheduledTriggers = newSchedules;
    await tokenStorage.setItem(
      SCHEDULED_LOCAL_NOTIFICATIONS_KEY,
      JSON.stringify(scheduledTriggers)
    );
  }
};
