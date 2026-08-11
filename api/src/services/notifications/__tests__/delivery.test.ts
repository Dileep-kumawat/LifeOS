import { describe, it, expect, vi } from "vitest";
import {
  buildPushPayload,
  dispatchNotification,
  type DeliveryDeps,
  type NotificationLike,
  type PushSubscriptionLike
} from "../delivery.js";

function notification(overrides: Partial<NotificationLike> = {}): NotificationLike {
  return {
    _id: "notif-1",
    userId: "u1",
    type: "habit_reminder",
    channel: "push",
    payload: { title: "Habits due", body: "", data: {}, items: [{ title: "Morning run" }] },
    deliveryStatus: "pending",
    ...overrides
  };
}

function sub(id: string): PushSubscriptionLike {
  return { _id: id, endpoint: `https://push.example/${id}`, keys: { p256dh: "k", auth: "a" } };
}

function deps(overrides: Partial<DeliveryDeps> = {}): DeliveryDeps {
  return {
    getSubscriptions: vi.fn(),
    sendPush: vi.fn(),
    deleteSubscriptions: vi.fn(),
    markDelivered: vi.fn(),
    ...overrides
  } as DeliveryDeps;
}

describe("delivery preference gate", () => {
  it("skips (does NOT send) a habit push when the user disabled habit push", async () => {
    const d = deps({ getSubscriptions: vi.fn().mockResolvedValue([sub("s1")]) });

    const outcome = await dispatchNotification(
      notification(),
      { habitReminders: { push: false, inApp: true } },
      d
    );

    expect(outcome.outcome).toBe("skipped_preference");
    expect(outcome.reason).toBe("habitReminders");
    expect(d.sendPush).not.toHaveBeenCalled();
    expect(d.markDelivered).not.toHaveBeenCalled();
  });

  it("skips an in-app notification when inApp is disabled for the module", async () => {
    const d = deps();
    const outcome = await dispatchNotification(
      notification({ channel: "in_app" }),
      { habitReminders: { push: true, inApp: false } },
      d
    );
    expect(outcome.outcome).toBe("skipped_preference");
    expect(d.markDelivered).not.toHaveBeenCalled();
  });

  it("still delivers when preferences are missing entirely (defaults to enabled)", async () => {
    const d = deps({
      getSubscriptions: vi.fn().mockResolvedValue([sub("s1")]),
      sendPush: vi.fn().mockResolvedValue({ status: "ok", subscriptionId: "s1" })
    });
    const outcome = await dispatchNotification(notification(), undefined, d);
    expect(outcome.outcome).toBe("delivered");
    expect(d.sendPush).toHaveBeenCalledTimes(1);
    expect(d.markDelivered).toHaveBeenCalledTimes(1);
  });
});

describe("push delivery + stale subscription cleanup", () => {
  it("deletes a 410-Gone subscription automatically and delivers via the surviving one", async () => {
    const d = deps({
      getSubscriptions: vi.fn().mockResolvedValue([sub("alive"), sub("stale")]),
      sendPush: vi.fn(async (s: PushSubscriptionLike) =>
        s._id === "stale"
          ? { status: "unsubscribed" as const, subscriptionId: "stale" }
          : { status: "ok" as const, subscriptionId: s._id }
      )
    });

    const outcome = await dispatchNotification(notification(), undefined, d);

    expect(d.sendPush).toHaveBeenCalledTimes(2);
    expect(d.deleteSubscriptions).toHaveBeenCalledWith(["stale"]);
    expect(d.markDelivered).toHaveBeenCalledTimes(1);
    expect(outcome.outcome).toBe("delivered");
    expect(outcome.cleanedSubscriptionIds).toEqual(["stale"]);
  });

  it("cleans up when ALL subscriptions return 410 and still marks delivered (nothing left to send)", async () => {
    const d = deps({
      getSubscriptions: vi.fn().mockResolvedValue([sub("dead1"), sub("dead2")]),
      sendPush: vi.fn().mockResolvedValue({ status: "unsubscribed", subscriptionId: "x" })
    });

    const outcome = await dispatchNotification(notification(), undefined, d);

    expect(d.deleteSubscriptions).toHaveBeenCalledTimes(1);
    expect(outcome.outcome).toBe("no_subscriptions_after_cleanup");
    expect(outcome.cleanedSubscriptionIds).toHaveLength(2);
    expect(d.markDelivered).toHaveBeenCalledTimes(1);
  });

  it("returns pending_retry (worker throws → BullMQ retries) when sends fail transiently with no cleanup", async () => {
    const d = deps({
      getSubscriptions: vi.fn().mockResolvedValue([sub("s1")]),
      sendPush: vi
        .fn()
        .mockResolvedValue({ status: "failed", subscriptionId: "s1", detail: "network" })
    });

    const outcome = await dispatchNotification(notification(), undefined, d);

    expect(outcome.outcome).toBe("pending_retry");
    expect(d.deleteSubscriptions).not.toHaveBeenCalled();
    expect(d.markDelivered).not.toHaveBeenCalled();
  });

  it("skips when the user has no push subscriptions", async () => {
    const d = deps({ getSubscriptions: vi.fn().mockResolvedValue([]) });
    const outcome = await dispatchNotification(notification(), undefined, d);
    expect(outcome.outcome).toBe("skipped_no_subscriptions");
  });

  it("does not double-deliver an already-sent notification", async () => {
    const d = deps({ getSubscriptions: vi.fn().mockResolvedValue([sub("s1")]) });
    const outcome = await dispatchNotification(
      notification({ deliveryStatus: "sent" }),
      undefined,
      d
    );
    expect(outcome.outcome).toBe("already_delivered");
    expect(d.sendPush).not.toHaveBeenCalled();
  });
});

describe("push payload batching shape", () => {
  it("summarizes batched reminders in the title when more than one item is present", () => {
    const payload = buildPushPayload(
      notification({
        payload: {
          title: "Habits due",
          body: "",
          data: {},
          items: [{ title: "A" }, { title: "B" }, { title: "C" }]
        }
      })
    ) as { title: string; items: unknown[] };
    expect(payload.title).toBe("You have 3 notifications");
    expect(payload.items).toHaveLength(3);
  });
});
