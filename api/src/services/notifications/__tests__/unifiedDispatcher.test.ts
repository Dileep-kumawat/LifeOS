import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendPushNotification } from "../sendPush.js";
import { dispatchNotification, type DeliveryDeps, type NotificationLike } from "../delivery.js";

// Mock firebase
const mockSend = vi.fn();
vi.mock("../firebase.js", () => ({
  getFirebaseMessaging: vi.fn(() => ({
    send: mockSend
  }))
}));

// Mock web-push
const mockWebPushSend = vi.fn();
vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn((...args) => mockWebPushSend(...args))
  }
}));

describe("Unified Push Dispatcher (Web Push & Native FCM)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendPushNotification", () => {
    it("delivers Web Push notification when subscription has endpoint and keys", async () => {
      mockWebPushSend.mockResolvedValueOnce({ statusCode: 201 });

      const sub = {
        id: "sub-web-1",
        endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
        keys: { p256dh: "key-123", auth: "auth-456" }
      };

      const result = await sendPushNotification(sub, { title: "Test", body: "Hello" });

      expect(result.status).toBe("ok");
      expect(result.subscriptionId).toBe("sub-web-1");
      expect(mockWebPushSend).toHaveBeenCalledTimes(1);
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("marks Web Push as unsubscribed when service returns 410 Gone", async () => {
      mockWebPushSend.mockRejectedValueOnce({ statusCode: 410 });

      const sub = {
        id: "sub-web-stale",
        endpoint: "https://updates.push.services.mozilla.com/wpush/v2/xyz",
        keys: { p256dh: "key-123", auth: "auth-456" }
      };

      const result = await sendPushNotification(sub, { title: "Test" });

      expect(result.status).toBe("unsubscribed");
      expect(result.detail).toBe("410");
    });

    it("delivers Native FCM push with notification and data blocks when endpoint starts with fcm:", async () => {
      mockSend.mockResolvedValueOnce("projects/lifeos/messages/12345");

      const sub = {
        id: "sub-fcm-1",
        endpoint: "fcm:device-token-abc-999",
        keys: null
      };

      const payload = {
        title: "Daily AI Summary Ready",
        body: "Your morning briefing is ready to review",
        data: { type: "daily_summary", deepLink: "/dashboard" }
      };

      const result = await sendPushNotification(sub, payload);

      expect(result.status).toBe("ok");
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          token: "device-token-abc-999",
          notification: {
            title: "Daily AI Summary Ready",
            body: "Your morning briefing is ready to review"
          },
          data: expect.objectContaining({
            type: "daily_summary",
            deepLink: "/dashboard"
          }),
          android: expect.objectContaining({
            notification: expect.objectContaining({
              channelId: "lifeos_alerts"
            })
          })
        })
      );
      expect(mockWebPushSend).not.toHaveBeenCalled();
    });

    it("prunes dead FCM tokens returning messaging/registration-token-not-registered", async () => {
      mockSend.mockRejectedValueOnce({
        code: "messaging/registration-token-not-registered",
        message: "The registration token is not registered"
      });

      const sub = {
        id: "sub-fcm-dead",
        endpoint: "fcm:obsolete-device-token",
        keys: null
      };

      const result = await sendPushNotification(sub, { title: "Alert" });

      expect(result.status).toBe("unsubscribed");
      expect(result.detail).toBe("messaging/registration-token-not-registered");
    });

    it("prunes invalid FCM tokens returning messaging/invalid-registration-token", async () => {
      mockSend.mockRejectedValueOnce({
        code: "messaging/invalid-registration-token",
        message: "Invalid token"
      });

      const sub = {
        id: "sub-fcm-invalid",
        endpoint: "fcm:corrupt-token",
        keys: null
      };

      const result = await sendPushNotification(sub, { title: "Alert" });

      expect(result.status).toBe("unsubscribed");
    });
  });

  describe("Unified Multi-Device Dispatch", () => {
    it("delivers to both Web Push and FCM devices in a single notification dispatch", async () => {
      const mockWebSub = {
        _id: "web-sub-1",
        endpoint: "https://web.push.apple.com/sub/123",
        keys: { p256dh: "key", auth: "auth" }
      };
      const mockFcmSub = {
        _id: "fcm-sub-2",
        endpoint: "fcm:fcm-android-token-456",
        keys: { p256dh: "", auth: "" }
      };

      const deletedIds: string[] = [];
      const markedDeliveredIds: string[] = [];

      const testDeps: DeliveryDeps = {
        getSubscriptions: vi.fn().mockResolvedValue([mockWebSub, mockFcmSub]),
        sendPush: vi.fn(async (s) => {
          if (s._id === "web-sub-1") return { status: "ok", subscriptionId: s._id };
          if (s._id === "fcm-sub-2") return { status: "ok", subscriptionId: s._id };
          return { status: "failed", subscriptionId: s._id };
        }),
        deleteSubscriptions: vi.fn(async (ids) => {
          deletedIds.push(...ids);
        }),
        markDelivered: vi.fn(async (id) => {
          markedDeliveredIds.push(id);
        })
      };

      const notif: NotificationLike = {
        _id: "notif-multi-1",
        userId: "user-abc",
        type: "daily_summary",
        channel: "push",
        payload: {
          title: "LifeOS Morning Summary",
          body: "3 tasks scheduled today"
        }
      };

      const outcome = await dispatchNotification(notif, {}, testDeps);

      expect(outcome.outcome).toBe("delivered");
      expect(testDeps.sendPush).toHaveBeenCalledTimes(2);
      expect(markedDeliveredIds).toContain("notif-multi-1");
      expect(deletedIds).toHaveLength(0);
    });

    it("cleans up dead devices while successfully delivering to active ones", async () => {
      const activeWebSub = {
        _id: "active-web",
        endpoint: "https://fcm.googleapis.com/fcm/send/active",
        keys: { p256dh: "k", auth: "a" }
      };
      const deadFcmSub = {
        _id: "dead-fcm",
        endpoint: "fcm:uninstalled-app-token",
        keys: { p256dh: "", auth: "" }
      };

      const deletedIds: string[] = [];

      const testDeps: DeliveryDeps = {
        getSubscriptions: vi.fn().mockResolvedValue([activeWebSub, deadFcmSub]),
        sendPush: vi.fn(async (s) => {
          if (s._id === "active-web") return { status: "ok", subscriptionId: s._id };
          if (s._id === "dead-fcm") return { status: "unsubscribed", subscriptionId: s._id };
          return { status: "failed", subscriptionId: s._id };
        }),
        deleteSubscriptions: vi.fn(async (ids) => {
          deletedIds.push(...ids);
        }),
        markDelivered: vi.fn()
      };

      const notif: NotificationLike = {
        _id: "notif-multi-2",
        userId: "user-abc",
        type: "calendar_reminder",
        channel: "push",
        payload: {
          title: "Meeting starting now"
        }
      };

      const outcome = await dispatchNotification(notif, {}, testDeps);

      expect(outcome.outcome).toBe("delivered");
      expect(outcome.cleanedSubscriptionIds).toEqual(["dead-fcm"]);
      expect(deletedIds).toEqual(["dead-fcm"]);
      expect(testDeps.markDelivered).toHaveBeenCalledTimes(1);
    });
  });
});
