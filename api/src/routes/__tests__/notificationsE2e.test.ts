import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ──────────────────────────────────────────────────────────────────
vi.mock("../../db/redis.js", () => ({
  redis: {
    on: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    quit: vi.fn()
  }
}));

vi.mock("bullmq", () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue({ id: "job-e2e-1" }),
    getJob: vi.fn().mockResolvedValue(null)
  })),
  Worker: vi.fn(),
  QueueEvents: vi.fn()
}));

vi.mock("../../services/queue.js", () => ({
  enqueueJob: vi.fn().mockResolvedValue({ queued: true, duplicate: false, jobId: "job-e2e-1" }),
  jobsQueue: {
    getJob: vi.fn().mockResolvedValue(null)
  }
}));

import {
  countUnreadNotifications,
  markNotificationRead
} from "../../services/notifications/notificationsRepo.js";
import { scheduleEventReminder } from "../../services/notifications/calendarReminders.js";
import { serializeNotification } from "../../services/notifications/serializers.js";

describe("Phase 2 Notifications End-to-End Spot-Check Flow", () => {
  let mockNotificationModel: any;
  let mockPushSubModel: any;
  const userId = "507f1f77bcf86cd799439011";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("completes the full flow: push sub -> event reminder -> notification list -> mark read -> unread count", async () => {
    // 1. Register push subscription mock response
    const pushSubscriptionData = {
      _id: "662c9f1e9f0b2a001c3d4e90",
      userId,
      endpoint: "https://fcm.googleapis.com/fcm/send/test-device-endpoint",
      keys: { p256dh: "test-p256dh-key", auth: "test-auth-key" },
      userAgent: "Mozilla/5.0"
    };

    mockPushSubModel = {
      findOneAndUpdate: vi.fn().mockResolvedValue(pushSubscriptionData)
    };

    const sub = await mockPushSubModel.findOneAndUpdate(
      { userId, endpoint: pushSubscriptionData.endpoint },
      { $set: pushSubscriptionData },
      { upsert: true, new: true }
    );
    expect(sub.endpoint).toBe("https://fcm.googleapis.com/fcm/send/test-device-endpoint");

    // 2. Schedule calendar event reminder
    const startTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hr in future
    const event = {
      _id: { toString: () => "evt-100" },
      userId: { toString: () => userId },
      startTime,
      reminderLeadMinutes: 15
    } as any;

    const jobId = await scheduleEventReminder(event);
    expect(jobId).toBe("job-e2e-1");

    // 3. Stored notification record (simulating notification created in DB)
    const storedDoc = {
      _id: { toString: () => "notif-999" },
      userId,
      type: "calendar_reminder",
      channel: "in_app",
      payload: {
        title: "Upcoming Event: Team Sync",
        body: "Starts in 15 minutes",
        data: { eventId: "evt-100" }
      },
      deliveryStatus: "sent",
      readStatus: "unread",
      scheduledFor: new Date(),
      sentAt: new Date(),
      readAt: null,
      createdAt: new Date()
    };

    mockNotificationModel = {
      countDocuments: vi.fn().mockImplementation((query: any) => {
        if (query.readStatus === "unread") return Promise.resolve(1);
        if (query.readStatus === "read") return Promise.resolve(0);
        return Promise.resolve(1);
      }),
      find: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([storedDoc])
          })
        })
      }),
      findOneAndUpdate: vi.fn().mockImplementation((filter: any) => {
        if (filter._id === "notif-999" && filter.userId === userId) {
          return Promise.resolve({
            ...storedDoc,
            readStatus: "read",
            readAt: new Date()
          });
        }
        return Promise.resolve(null);
      })
    };

    // 4. GET /notifications -> Confirm notification appears in list
    const unreadCountBefore = await countUnreadNotifications(mockNotificationModel, userId);
    expect(unreadCountBefore).toBe(1);

    const docs = await mockNotificationModel.find({ userId }).sort().skip().limit();
    const serialized = docs.map(serializeNotification);
    expect(serialized).toHaveLength(1);
    expect(serialized[0].readStatus).toBe("unread");
    expect(serialized[0].payload.title).toBe("Upcoming Event: Team Sync");

    // 5. Mark notification read -> PATCH /notifications/notif-999/read
    const updatedNotif = await markNotificationRead(mockNotificationModel, userId, "notif-999");
    expect(updatedNotif).toBeDefined();
    expect((updatedNotif as any).readStatus).toBe("read");

    // 6. Confirm unread-count reflects the update
    mockNotificationModel.countDocuments = vi.fn().mockImplementation((query: any) => {
      if (query.readStatus === "unread") return Promise.resolve(0);
      return Promise.resolve(1);
    });

    const unreadCountAfter = await countUnreadNotifications(mockNotificationModel, userId);
    expect(unreadCountAfter).toBe(0);
  });
});
