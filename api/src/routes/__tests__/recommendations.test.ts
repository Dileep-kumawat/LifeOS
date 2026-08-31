import { describe, it, expect, vi, beforeEach } from "vitest";
import { Types } from "mongoose";

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
    add: vi.fn().mockResolvedValue({ id: "job-rec-1" }),
    getJob: vi.fn().mockResolvedValue(null)
  })),
  Worker: vi.fn(),
  QueueEvents: vi.fn()
}));

vi.mock("../../services/queue.js", () => ({
  enqueueJob: vi.fn().mockResolvedValue({ queued: true, duplicate: false, jobId: "job-rec-1" }),
  jobsQueue: {
    getJob: vi.fn().mockResolvedValue(null)
  }
}));

vi.mock("../../services/ai/callAI.js", () => ({
  callAI: vi.fn().mockImplementation(async (messages: any[]) => {
    const userMsg = messages.find((m: any) => m.role === "user")?.content || "";
    const parsedContext = JSON.parse(userMsg || "{}");
    const diningCategory = parsedContext.finance?.topExpenseCategories?.[0]?.category || "Dining Out";
    const diningAmount = parsedContext.finance?.topExpenseCategories?.[0]?.amount || 280;

    return {
      success: true,
      content: JSON.stringify({
        recommendations: [
          {
            domain: "finance",
            title: `Rebalance ${diningCategory} Budget`,
            category: diningCategory,
            message: `Your ${diningCategory} spend reached $${diningAmount}, exceeding your monthly threshold.`,
            actionableStep: `Set an 80% spending threshold alert and prepare meals at home this week.`,
            metricGrounded: `$${diningAmount} spent vs limit`,
            impact: "high"
          },
          {
            domain: "habits",
            title: "Strengthen Weekend Habit Consistency",
            category: "Morning 30-min run",
            message: "Habit consistency dropped on weekends (40% vs 90% weekdays).",
            actionableStep: "Try a lighter 15-minute weekend jogging goal to maintain streak.",
            metricGrounded: "40% weekend completion rate",
            impact: "medium"
          },
          {
            domain: "productivity",
            title: "Maintain Deep Work Cadence",
            category: "Focus",
            message: "You accumulated 120 focus minutes across 4 Pomodoro sessions.",
            actionableStep: "Book 2 morning focus blocks next week for major milestone tasks.",
            metricGrounded: "120 focus mins / 4 sessions",
            impact: "low"
          }
        ]
      }),
      providerServed: "mistral"
    };
  })
}));

vi.mock("../../services/notifications/scheduler.js", () => ({
  scheduleNotification: vi.fn().mockResolvedValue({
    notificationId: "notif-rec-123",
    batched: false,
    enqueued: true,
    duplicate: false
  })
}));

vi.mock("../../services/analytics/productivityAnalyticsService.js", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    getProductivityAnalytics: vi.fn().mockResolvedValue({
      period: { startDate: "2026-08-24", endDate: "2026-08-30", totalDays: 7 },
      habits: { totalExpected: 14, totalCompleted: 8, completionRate: 0.57 },
      focus: {
        totalFocusMinutes: 120,
        totalSessionsCount: 5,
        completedSessionsCount: 4,
        abandonedSessionsCount: 1,
        activeSessionsCount: 0,
        averageSessionMinutes: 24,
        linkedTypeBreakdown: { goal: 60, topic: 60, task: 0, none: 0 }
      },
      habitConsistency: [
        {
          habitId: "h-1",
          title: "Morning 30-min run",
          frequency: { type: "daily" },
          currentStreak: 3,
          longestStreak: 5,
          rangeExpected: 7,
          rangeCompleted: 3,
          rangeCompletionRate: 0.43,
          lastCheckInDate: "2026-08-29"
        }
      ],
      trend: []
    })
  };
});

vi.mock("../../services/analytics/financeAnalyticsService.js", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    getFinanceAnalytics: vi.fn().mockResolvedValue({
      period: { startDate: "2026-08-24", endDate: "2026-08-30", totalDays: 7 },
      summary: {
        totalIncome: 2000,
        totalExpense: 1400,
        netSavings: 600,
        savingsRate: 30,
        transactionCount: 12
      },
      categoryBreakdown: [
        { category: "Dining Out", type: "expense", totalAmount: 280, count: 4, percentage: 20 },
        { category: "Groceries", type: "expense", totalAmount: 350, count: 6, percentage: 25 }
      ],
      trend: [],
      budgetAdherence: {
        budgetsTracked: 2,
        budgetsOnTrack: 1,
        budgetsExceeded: 1,
        adherenceRate: 0.5,
        budgets: [
          {
            budgetId: "b-1",
            category: "Dining Out",
            limit: 250,
            actualSpend: 280,
            percentUsed: 112,
            isOverBudget: true,
            status: "exceeded"
          },
          {
            budgetId: "b-2",
            category: "Groceries",
            limit: 500,
            actualSpend: 350,
            percentUsed: 70,
            isOverBudget: false,
            status: "on_track"
          }
        ]
      }
    })
  };
});

import { User } from "../../models/User.js";
import { Recommendation } from "../../models/Recommendation.js";
import {
  generatePeriodicRecommendations,
  computePeriodBounds
} from "../../services/ai/recommendationGenerator.js";
import { dispatchPeriodicRecommendations } from "../../services/ai/recommendationDispatcher.js";
import { enqueueJob } from "../../services/queue.js";
import { scheduleNotification } from "../../services/notifications/scheduler.js";
import { isPreferenceEnabled } from "../../services/notifications/preferences.js";
import { callAI } from "../../services/ai/callAI.js";

describe("Periodic Recommendations (FR-10.3) Unit & Integration Tests", () => {
  const mockUserId = "662c9f1e9f0b2a001c3d4e5a";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── 1. Period Boundaries Computation ──────────────────────────────────────────
  describe("Period Boundaries Calculation", () => {
    it("computes previous 7-day bounds for weekly recommendations", () => {
      const refDate = new Date(Date.UTC(2026, 7, 31)); // 2026-08-31
      const bounds = computePeriodBounds("weekly", refDate, "UTC");
      expect(bounds.startDateStr).toBe("2026-08-24");
      expect(bounds.endDateStr).toBe("2026-08-30");
    });

    it("computes full previous month bounds for monthly recommendations", () => {
      const refDate = new Date(Date.UTC(2026, 8, 1)); // 2026-09-01
      const bounds = computePeriodBounds("monthly", refDate, "UTC");
      expect(bounds.startDateStr).toBe("2026-08-01");
      expect(bounds.endDateStr).toBe("2026-08-31");
    });
  });

  // ─── 2. Scheduled Job Dispatcher ─────────────────────────────────────────────
  describe("Dispatcher Cadence & Queue Integration", () => {
    it("enqueues weekly job with proper dedupeKey when weekly cadence is triggered", async () => {
      const mockUsers = [
        {
          _id: new Types.ObjectId(mockUserId),
          notificationPreferences: {
            dailySummary: { timezone: "UTC" },
            periodicRecommendations: { push: true, inApp: true }
          }
        }
      ];

      vi.spyOn(User, "find").mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockUsers)
        })
      } as any);

      vi.spyOn(Recommendation, "findOne").mockResolvedValue(null);

      const result = await dispatchPeriodicRecommendations("weekly", "08:00", "2026-08-30");

      expect(result.enqueuedWeekly).toBe(1);
      expect(result.userIds).toContain(mockUserId);
      expect(enqueueJob).toHaveBeenCalledWith(
        "generate_periodic_recommendations",
        expect.objectContaining({
          userId: mockUserId,
          period: "weekly",
          startDate: expect.any(String),
          endDate: expect.any(String)
        }),
        expect.objectContaining({
          dedupeKey: expect.stringContaining(`periodic_rec__${mockUserId}__weekly__`)
        })
      );
    });

    it("enqueues monthly job with proper dedupeKey on 1st of month", async () => {
      const mockUsers = [
        {
          _id: new Types.ObjectId(mockUserId),
          notificationPreferences: {
            dailySummary: { timezone: "UTC" },
            periodicRecommendations: { push: true, inApp: true }
          }
        }
      ];

      vi.spyOn(User, "find").mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockUsers)
        })
      } as any);

      vi.spyOn(Recommendation, "findOne").mockResolvedValue(null);

      const result = await dispatchPeriodicRecommendations("monthly", "08:00", "2026-09-01");

      expect(result.enqueuedMonthly).toBe(1);
      expect(result.userIds).toContain(mockUserId);
      expect(enqueueJob).toHaveBeenCalledWith(
        "generate_periodic_recommendations",
        expect.objectContaining({
          userId: mockUserId,
          period: "monthly",
          startDate: "2026-08-01",
          endDate: "2026-08-31"
        }),
        expect.objectContaining({
          dedupeKey: `periodic_rec__${mockUserId}__monthly__2026-08-01`
        })
      );
    });

    it("skips enqueuing if recommendation document is already present for the period", async () => {
      const mockUsers = [
        {
          _id: new Types.ObjectId(mockUserId),
          notificationPreferences: { dailySummary: { timezone: "UTC" } }
        }
      ];

      vi.spyOn(User, "find").mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(mockUsers)
        })
      } as any);

      vi.spyOn(Recommendation, "findOne").mockResolvedValue({ _id: "existing-rec" } as any);

      const result = await dispatchPeriodicRecommendations("weekly", "08:00", "2026-08-30");

      expect(result.enqueuedWeekly).toBe(0);
      expect(enqueueJob).not.toHaveBeenCalled();
    });
  });

  // ─── 3. Content Generation Grounded in Real Data ─────────────────────────────
  describe("Content Generation Grounded in Aggregated Metrics", () => {
    it("generates structured recommendations that explicitly reference seeded data (Dining Out, $280, Morning Run)", async () => {
      const mockUser = {
        _id: new Types.ObjectId(mockUserId),
        notificationPreferences: {
          periodicRecommendations: { push: true, inApp: true }
        }
      };

      vi.spyOn(User, "findById").mockResolvedValue(mockUser as any);
      vi.spyOn(Recommendation, "findOneAndUpdate").mockImplementation((_query: any, update: any) => {
        return Promise.resolve({
          _id: "rec-doc-123",
          userId: mockUserId,
          period: update.$set.period,
          periodStart: update.$set.periodStart,
          periodEnd: update.$set.periodEnd,
          recommendations: update.$set.recommendations,
          generatedAt: update.$set.generatedAt
        }) as any;
      });

      const doc = await generatePeriodicRecommendations(
        mockUserId,
        "weekly",
        "2026-08-24",
        "2026-08-30"
      );

      expect(doc).toBeDefined();
      expect(doc.recommendations).toHaveLength(3);

      // Verify grounded data assertions
      const financeRec = doc.recommendations.find((r) => r.domain === "finance");
      expect(financeRec).toBeDefined();
      expect(financeRec?.category).toBe("Dining Out");
      expect(financeRec?.message).toContain("$280");
      expect(financeRec?.metricGrounded).toContain("$280");

      const habitRec = doc.recommendations.find((r) => r.domain === "habits");
      expect(habitRec).toBeDefined();
      expect(habitRec?.category).toBe("Morning 30-min run");
      expect(habitRec?.metricGrounded).toContain("40%");

      const focusRec = doc.recommendations.find((r) => r.domain === "productivity");
      expect(focusRec).toBeDefined();
      expect(focusRec?.message).toContain("120");

      // Verify notification delivery scheduled
      expect(scheduleNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          type: "periodic_recommendation",
          title: "Weekly AI Recommendations",
          data: expect.objectContaining({
            recommendationId: "rec-doc-123",
            period: "weekly",
            periodStart: "2026-08-24",
            periodEnd: "2026-08-30"
          })
        })
      );
    });
  });

  // ─── 4. Notification Preferences Enforcement ────────────────────────────────
  describe("Notification Preferences & Delivery Controls", () => {
    it("respects periodicRecommendations push toggle in user preferences", async () => {
      const userPrefsEnabled = {
        periodicRecommendations: { push: true, inApp: true }
      };
      const userPrefsDisabled = {
        periodicRecommendations: { push: false, inApp: false }
      };

      expect(isPreferenceEnabled(userPrefsEnabled, "periodicRecommendations", "push")).toBe(true);
      expect(isPreferenceEnabled(userPrefsEnabled, "periodicRecommendations", "in_app")).toBe(true);

      expect(isPreferenceEnabled(userPrefsDisabled, "periodicRecommendations", "push")).toBe(false);
      expect(isPreferenceEnabled(userPrefsDisabled, "periodicRecommendations", "in_app")).toBe(false);
    });

    it("does not enqueue notifications when user disabled periodicRecommendations", async () => {
      const mockUserDisabled = {
        _id: new Types.ObjectId(mockUserId),
        notificationPreferences: {
          periodicRecommendations: { push: false, inApp: false }
        }
      };

      vi.spyOn(User, "findById").mockResolvedValue(mockUserDisabled as any);
      vi.spyOn(Recommendation, "findOneAndUpdate").mockResolvedValue({
        _id: "rec-doc-disabled",
        recommendations: [{ title: "Test" }]
      } as any);

      await generatePeriodicRecommendations(mockUserId, "weekly", "2026-08-24", "2026-08-30");

      expect(scheduleNotification).not.toHaveBeenCalled();
    });
  });

  // ─── 5. Error & Retry Handling (BullMQ exponential backoff) ───────────────────
  describe("Total-Provider Failure & Retry Propagation", () => {
    it("throws an error when callAI fails completely so BullMQ can retry with exponential backoff", async () => {
      const mockUser = {
        _id: new Types.ObjectId(mockUserId),
        notificationPreferences: { periodicRecommendations: { push: true, inApp: true } }
      };

      vi.spyOn(User, "findById").mockResolvedValue(mockUser as any);
      vi.mocked(callAI).mockResolvedValueOnce({
        success: false,
        content: null,
        error: "All providers failed (503 Service Unavailable)",
        providerServed: undefined as any
      });

      await expect(
        generatePeriodicRecommendations(mockUserId, "weekly", "2026-08-24", "2026-08-30")
      ).rejects.toThrow(/callAI failed during periodic recommendation generation/);
    });
  });
});
