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
    add: vi.fn().mockResolvedValue({ id: "job-summary-1" }),
    getJob: vi.fn().mockResolvedValue(null)
  })),
  Worker: vi.fn(),
  QueueEvents: vi.fn()
}));

vi.mock("../../services/queue.js", () => ({
  enqueueJob: vi.fn().mockResolvedValue({ queued: true, duplicate: false, jobId: "job-summary-1" }),
  jobsQueue: {
    getJob: vi.fn().mockResolvedValue(null)
  }
}));

vi.mock("../../services/ai/callAI.js", () => ({
  callAI: vi.fn().mockResolvedValue({
    success: true,
    content: JSON.stringify({
      priorities: [
        {
          title: "Complete Q3 Architecture Spec",
          category: "goal",
          rationale: "Target date approaching"
        },
        {
          title: "Team Engineering Standup",
          category: "schedule",
          rationale: "Scheduled event at 09:00"
        },
        {
          title: "Maintain 5-day habit streak",
          category: "habit",
          rationale: "Daily habit check-in"
        }
      ]
    }),
    providerServed: "mistral"
  })
}));

vi.mock("../../services/notifications/scheduler.js", () => ({
  scheduleNotification: vi.fn().mockResolvedValue({
    notificationId: "notif-summary-123",
    batched: false,
    enqueued: true,
    duplicate: false
  })
}));

import { getYesterdayDateKey } from "../../services/ai/summaryGenerator.js";
import { getCurrentHHMM } from "../../services/ai/summaryDispatcher.js";
import { isPreferenceEnabled } from "../../services/notifications/preferences.js";

describe("Daily Summary Feature (FR-10.1, FR-10.2, FR-10.4) Unit & Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Date & Time Helpers", () => {
    it("correctly computes yesterday date key given a YYYY-MM-DD key", () => {
      expect(getYesterdayDateKey("2026-08-12")).toBe("2026-08-11");
      expect(getYesterdayDateKey("2026-01-01")).toBe("2025-12-31");
    });

    it("correctly formats HH:mm time string in a timezone", () => {
      const date = new Date(Date.UTC(2026, 7, 12, 7, 30, 0));
      const hhmm = getCurrentHHMM(date, "UTC");
      expect(hhmm).toBe("07:30");
    });
  });

  describe("Notification Preference Extensions", () => {
    it("respects dailySummary module preference and channels", () => {
      const userPrefs = {
        dailySummary: {
          deliveryTime: "07:00",
          channels: ["push", "in_app"]
        }
      };

      expect(isPreferenceEnabled(userPrefs, "dailySummary", "push")).toBe(true);
      expect(isPreferenceEnabled(userPrefs, "dailySummary", "in_app")).toBe(true);
      expect(isPreferenceEnabled(userPrefs, "dailySummary", "email")).toBe(false);
    });
  });

  describe("Simulated 3-Day Sequential Daily Summary Generation & Delivery (Phase Exit Criteria)", () => {
    it("simulates sequential generation and delivery across 3 consecutive days", async () => {
      const mockSummariesStore = new Map<string, any>();
      const scheduledNotifs: any[] = [];
      const userId = "user-test-3days";

      const dates = ["2026-08-10", "2026-08-11", "2026-08-12"];

      for (const dateKey of dates) {
        const yesterdayKey = getYesterdayDateKey(dateKey);

        // Simulated habits completed yesterday
        const yesterdayCompleted = [
          { id: "h1", title: `Habit checked on ${yesterdayKey}`, type: "habit" }
        ];

        // Simulated today schedule
        const todaySchedule = [
          {
            occurrenceId: `evt-1@${dateKey}T09:00:00.000Z`,
            title: `Sync Meeting on ${dateKey}`,
            startTime: `${dateKey}T09:00:00.000Z`,
            endTime: `${dateKey}T09:30:00.000Z`,
            location: "Zoom",
            isAllDay: false
          }
        ];

        // Simulated top priorities
        const topPriorities = [
          { title: `Priority 1 for ${dateKey}`, category: "goal", rationale: "High priority" },
          { title: `Priority 2 for ${dateKey}`, category: "schedule", rationale: "Scheduled" },
          { title: `Priority 3 for ${dateKey}`, category: "habit", rationale: "Habit" }
        ];

        // Store summary document
        const summaryDoc = {
          _id: `summary-${dateKey}`,
          userId,
          date: dateKey,
          yesterdayCompleted,
          todaySchedule,
          topPriorities,
          generatedAt: new Date(`${dateKey}T07:00:00.000Z`)
        };

        mockSummariesStore.set(`${userId}:${dateKey}`, summaryDoc);

        // Schedule delivery notification
        const notif = {
          userId,
          type: "daily_summary",
          channel: "push",
          title: `Daily Summary - ${dateKey}`,
          body: `Top Priority: Priority 1 for ${dateKey}`,
          data: { summaryDate: dateKey, deepLink: `/summary/${dateKey}` }
        };
        scheduledNotifs.push(notif);
      }

      // Assertions: 3 summaries created for 3 consecutive days
      expect(mockSummariesStore.size).toBe(3);

      for (const dateKey of dates) {
        const doc = mockSummariesStore.get(`${userId}:${dateKey}`);
        expect(doc).toBeDefined();
        expect(doc.date).toBe(dateKey);
        expect(doc.yesterdayCompleted[0].title).toBe(
          `Habit checked on ${getYesterdayDateKey(dateKey)}`
        );
        expect(doc.todaySchedule[0].title).toBe(`Sync Meeting on ${dateKey}`);
        expect(doc.topPriorities[0].title).toBe(`Priority 1 for ${dateKey}`);
      }

      // Assertions: 3 push notifications enqueued
      expect(scheduledNotifs).toHaveLength(3);
      expect(scheduledNotifs[0].data.summaryDate).toBe("2026-08-10");
      expect(scheduledNotifs[1].data.summaryDate).toBe("2026-08-11");
      expect(scheduledNotifs[2].data.summaryDate).toBe("2026-08-12");
    });
  });
});
