import { describe, it, expect, vi } from "vitest";
import { dispatchNotification, type DeliveryDeps, type NotificationLike } from "../delivery.js";

describe("Focus Session DND Notification Suppression (FR-8.4)", () => {
  const baseNotification = (type: string): NotificationLike => ({
    _id: "notif-1",
    userId: "user-123",
    type,
    channel: "push",
    payload: {
      title: "Test Notification",
      body: "Testing DND suppression",
      items: [{ title: "Item 1" }]
    },
    deliveryStatus: "pending"
  });

  const createMockDeps = (hasActiveSession: boolean): DeliveryDeps => ({
    getSubscriptions: vi.fn().mockResolvedValue([
      { _id: "sub-1", endpoint: "https://fcm.example.com", keys: { p256dh: "key", auth: "auth" } }
    ]),
    sendPush: vi.fn().mockResolvedValue({ status: "ok", subscriptionId: "sub-1" }),
    deleteSubscriptions: vi.fn().mockResolvedValue(undefined),
    markDelivered: vi.fn().mockResolvedValue(undefined),
    hasActiveFocusSession: vi.fn().mockResolvedValue(hasActiveSession)
  });

  it("suppresses non-critical notifications (calendar reminders) when DND is enabled and session is active", async () => {
    const preferences = {
      calendarReminders: { push: true, inApp: true },
      dndDuringFocus: true
    };
    const deps = createMockDeps(true); // Active session running

    const outcome = await dispatchNotification(
      baseNotification("calendar_reminder"),
      preferences,
      deps
    );

    expect(outcome.outcome).toBe("skipped_preference");
    expect(outcome.reason).toBe("focus_session_dnd");
    expect(deps.sendPush).not.toHaveBeenCalled();
  });

  it("suppresses habit reminders and daily summary when DND is enabled and session is active", async () => {
    const preferences = {
      habitReminders: { push: true, inApp: true },
      dailySummary: { deliveryTime: "07:00", channels: ["push", "in_app"] },
      dndDuringFocus: true
    };
    const deps = createMockDeps(true);

    const habitOutcome = await dispatchNotification(
      baseNotification("habit_reminder"),
      preferences,
      deps
    );
    expect(habitOutcome.outcome).toBe("skipped_preference");
    expect(habitOutcome.reason).toBe("focus_session_dnd");

    const summaryOutcome = await dispatchNotification(
      baseNotification("daily_summary"),
      preferences,
      deps
    );
    expect(summaryOutcome.outcome).toBe("skipped_preference");
    expect(summaryOutcome.reason).toBe("focus_session_dnd");
  });

  it("DOES NOT suppress focus session interval alerts even when DND is enabled and session is active", async () => {
    const preferences = {
      focusSessionAlerts: { push: true, inApp: true },
      dndDuringFocus: true
    };
    const deps = createMockDeps(true);

    const outcome = await dispatchNotification(
      baseNotification("focus_session_alert"),
      preferences,
      deps
    );

    expect(outcome.outcome).toBe("delivered");
    expect(deps.sendPush).toHaveBeenCalled();
  });

  it("DOES NOT suppress system critical notifications during active session", async () => {
    const preferences = {
      system: { push: true, inApp: true },
      dndDuringFocus: true
    };
    const deps = createMockDeps(true);

    const outcome = await dispatchNotification(
      baseNotification("system"),
      preferences,
      deps
    );

    expect(outcome.outcome).toBe("delivered");
    expect(deps.sendPush).toHaveBeenCalled();
  });

  it("delivers non-critical notifications normally when focus session has ended / no active session", async () => {
    const preferences = {
      calendarReminders: { push: true, inApp: true },
      dndDuringFocus: true
    };
    const deps = createMockDeps(false); // No active session

    const outcome = await dispatchNotification(
      baseNotification("calendar_reminder"),
      preferences,
      deps
    );

    expect(outcome.outcome).toBe("delivered");
    expect(deps.sendPush).toHaveBeenCalled();
  });

  it("delivers non-critical notifications normally when DND toggle is disabled (opt-in)", async () => {
    const preferences = {
      calendarReminders: { push: true, inApp: true },
      dndDuringFocus: false // DND off
    };
    const deps = createMockDeps(true); // Active session exists

    const outcome = await dispatchNotification(
      baseNotification("calendar_reminder"),
      preferences,
      deps
    );

    expect(outcome.outcome).toBe("delivered");
    expect(deps.sendPush).toHaveBeenCalled();
  });
});
