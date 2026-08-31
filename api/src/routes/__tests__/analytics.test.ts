import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { Types } from "mongoose";

const testUserId = new Types.ObjectId("662c9f1e9f0b2a001c3d4e0a");

// Mock auth middleware
vi.mock("../../middleware/authMiddleware.js", () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = {
      id: testUserId.toString(),
      _id: testUserId,
      tier: "free",
      status: "active"
    };
    next();
  }
}));

// In-memory data fixtures
let mockHabits: any[] = [];
let mockHabitCheckIns: any[] = [];
let mockTransactions: any[] = [];
let mockBudgets: any[] = [];
let mockFocusSessions: any[] = [];

// Redis rate limit mock storage
const redisStore = new Map<string, number>();

vi.mock("../../db/redis.js", () => ({
  redis: {
    incr: vi.fn().mockImplementation(async (key: string) => {
      const val = (redisStore.get(key) || 0) + 1;
      redisStore.set(key, val);
      return val;
    }),
    expire: vi.fn().mockResolvedValue(1),
    ttl: vi.fn().mockResolvedValue(3600)
  }
}));

// Mock Habit model
vi.mock("../../models/Habit.js", () => ({
  Habit: {
    find: vi.fn().mockImplementation((query: any) => ({
      lean: vi.fn().mockImplementation(async () => {
        return mockHabits.filter((h) => !query.userId || h.userId.toString() === query.userId.toString());
      })
    }))
  }
}));

// Mock HabitCheckIn model
vi.mock("../../models/HabitCheckIn.js", () => ({
  HabitCheckIn: {
    find: vi.fn().mockImplementation((query: any) => ({
      lean: vi.fn().mockImplementation(async () => {
        return mockHabitCheckIns.filter((c) => {
          if (query.userId && c.userId.toString() !== query.userId.toString()) return false;
          if (query.date?.$gte && c.date < query.date.$gte) return false;
          if (query.date?.$lte && c.date > query.date.$lte) return false;
          return true;
        });
      })
    }))
  }
}));

// Mock Transaction model
vi.mock("../../models/Transaction.js", () => ({
  Transaction: {
    aggregate: vi.fn().mockImplementation(async (pipeline: any[]) => {
      const matchStage = pipeline.find((p) => p.$match)?.$match;
      const groupStage = pipeline.find((p) => p.$group)?.$group;

      let filtered = mockTransactions.filter((t) => {
        if (matchStage?.userId && t.userId.toString() !== matchStage.userId.toString()) return false;
        if (matchStage?.date?.$gte && t.date < matchStage.date.$gte) return false;
        if (matchStage?.date?.$lte && t.date > matchStage.date.$lte) return false;
        return true;
      });

      if (!groupStage) return filtered;

      // Grouping by category & type
      if (groupStage._id?.category && groupStage._id?.type) {
        const groups = new Map<string, { _id: any; totalAmount: number; count: number }>();
        for (const t of filtered) {
          const key = `${t.category}__${t.type}`;
          const existing = groups.get(key) || {
            _id: { category: t.category, type: t.type },
            totalAmount: 0,
            count: 0
          };
          existing.totalAmount += t.amount;
          existing.count += 1;
          groups.set(key, existing);
        }
        return Array.from(groups.values());
      }

      // Grouping by period
      if (groupStage._id?.period) {
        const groups = new Map<string, { _id: any; totalAmount: number }>();
        for (const t of filtered) {
          const period = t.date.toISOString().split("T")[0]; // daily
          const key = `${period}__${t.type}`;
          const existing = groups.get(key) || {
            _id: { period, type: t.type },
            totalAmount: 0
          };
          existing.totalAmount += t.amount;
          groups.set(key, existing);
        }
        return Array.from(groups.values());
      }

      return [];
    })
  }
}));

// Mock Budget model
vi.mock("../../models/Budget.js", () => ({
  Budget: {
    find: vi.fn().mockImplementation((query: any) => ({
      lean: vi.fn().mockImplementation(async () => {
        return mockBudgets.filter((b) => !query.userId || b.userId.toString() === query.userId.toString());
      })
    }))
  }
}));

// Mock FocusSession model
vi.mock("../../models/FocusSession.js", () => ({
  FocusSession: {
    aggregate: vi.fn().mockImplementation(async (pipeline: any[]) => {
      const matchStage = pipeline.find((p) => p.$match)?.$match;
      const groupStage = pipeline.find((p) => p.$group)?.$group;

      let filtered = mockFocusSessions.filter((s) => {
        if (matchStage?.userId && s.userId.toString() !== matchStage.userId.toString()) return false;
        if (matchStage?.startedAt?.$gte && s.startedAt < matchStage.startedAt.$gte) return false;
        if (matchStage?.startedAt?.$lte && s.startedAt > matchStage.startedAt.$lte) return false;
        return true;
      });

      if (!groupStage) return filtered;

      // Overall totals
      if (groupStage._id === null) {
        let totalFocusMinutes = 0;
        let completedSessionsCount = 0;
        let abandonedSessionsCount = 0;
        let activeSessionsCount = 0;

        for (const s of filtered) {
          totalFocusMinutes += s.totalFocusMinutes || 0;
          if (s.status === "completed") completedSessionsCount++;
          if (s.status === "abandoned") abandonedSessionsCount++;
          if (s.status === "active" || s.status === "paused") activeSessionsCount++;
        }

        return [
          {
            _id: null,
            totalFocusMinutes,
            totalSessionsCount: filtered.length,
            completedSessionsCount,
            abandonedSessionsCount,
            activeSessionsCount
          }
        ];
      }

      // Group by linkedType
      if (groupStage._id === "$linkedType") {
        const groups = new Map<string, { _id: string; totalMinutes: number; count: number }>();
        for (const s of filtered) {
          const t = s.linkedType || "none";
          const existing = groups.get(t) || { _id: t, totalMinutes: 0, count: 0 };
          existing.totalMinutes += s.totalFocusMinutes || 0;
          existing.count += 1;
          groups.set(t, existing);
        }
        return Array.from(groups.values());
      }

      // Group by dateKey
      if (groupStage._id?.dateKey) {
        const groups = new Map<string, any>();
        for (const s of filtered) {
          const dateKey = s.startedAt.toISOString().split("T")[0];
          const existing = groups.get(dateKey) || {
            _id: { dateKey },
            totalMinutes: 0,
            count: 0,
            completedCount: 0,
            abandonedCount: 0
          };
          existing.totalMinutes += s.totalFocusMinutes || 0;
          existing.count += 1;
          if (s.status === "completed") existing.completedCount += 1;
          if (s.status === "abandoned") existing.abandonedCount += 1;
          groups.set(dateKey, existing);
        }
        return Array.from(groups.values());
      }

      return [];
    })
  }
}));

import { analyticsRouter } from "../analytics.js";

const app = express();
app.use(express.json());
app.use("/api/v1", analyticsRouter);

describe("Analytics Module (FR-12.1 – FR-12.4)", () => {
  beforeEach(() => {
    redisStore.clear();
    mockHabits = [];
    mockHabitCheckIns = [];
    mockTransactions = [];
    mockBudgets = [];
    mockFocusSessions = [];
  });

  describe("1. Productivity Analytics Endpoint (FR-12.1, FR-12.3)", () => {
    it("returns correct aggregation totals and completion rates for seeded habits and focus sessions", async () => {
      const habit1Id = new Types.ObjectId();
      const habit2Id = new Types.ObjectId();

      // Habit 1: Daily habit
      mockHabits.push({
        _id: habit1Id,
        userId: testUserId,
        title: "Daily Morning Run",
        frequency: { type: "daily" },
        currentStreak: 4,
        longestStreak: 10,
        lastCheckInDate: "2026-08-06"
      });

      // Habit 2: Weekly MWF (days [1, 3, 5])
      // In 2026-08-01 (Sat) to 2026-08-07 (Fri):
      // Aug 1: Sat (6)
      // Aug 2: Sun (0)
      // Aug 3: Mon (1) -> Expected
      // Aug 4: Tue (2)
      // Aug 5: Wed (3) -> Expected
      // Aug 6: Thu (4)
      // Aug 7: Fri (5) -> Expected
      // Expected = 3
      mockHabits.push({
        _id: habit2Id,
        userId: testUserId,
        title: "Syllabus Review",
        frequency: { type: "weekly", daysOfWeek: [1, 3, 5] },
        currentStreak: 2,
        longestStreak: 6,
        lastCheckInDate: "2026-08-05"
      });

      // Check-ins for Habit 1: 5 completions out of 7 days
      mockHabitCheckIns.push(
        { habitId: habit1Id, userId: testUserId, date: "2026-08-01", completed: true },
        { habitId: habit1Id, userId: testUserId, date: "2026-08-02", completed: true },
        { habitId: habit1Id, userId: testUserId, date: "2026-08-03", completed: true },
        { habitId: habit1Id, userId: testUserId, date: "2026-08-05", completed: true },
        { habitId: habit1Id, userId: testUserId, date: "2026-08-06", completed: true }
      );

      // Check-ins for Habit 2: 2 completions out of 3 expected
      mockHabitCheckIns.push(
        { habitId: habit2Id, userId: testUserId, date: "2026-08-03", completed: true },
        { habitId: habit2Id, userId: testUserId, date: "2026-08-05", completed: true }
      );

      // Focus sessions in range:
      // Session 1: Topic link, 50 mins, completed
      mockFocusSessions.push({
        _id: new Types.ObjectId(),
        userId: testUserId,
        totalFocusMinutes: 50,
        status: "completed",
        linkedType: "topic",
        startedAt: new Date("2026-08-03T10:00:00.000Z")
      });

      // Session 2: Goal link, 25 mins, completed
      mockFocusSessions.push({
        _id: new Types.ObjectId(),
        userId: testUserId,
        totalFocusMinutes: 25,
        status: "completed",
        linkedType: "goal",
        startedAt: new Date("2026-08-05T14:00:00.000Z")
      });

      // Session 3: Task link, 10 mins, abandoned
      mockFocusSessions.push({
        _id: new Types.ObjectId(),
        userId: testUserId,
        totalFocusMinutes: 10,
        status: "abandoned",
        linkedType: "task",
        startedAt: new Date("2026-08-06T16:00:00.000Z")
      });

      const res = await request(app)
        .get("/api/v1/analytics/productivity?startDate=2026-08-01&endDate=2026-08-07")
        .expect(200);

      expect(res.body.period.startDate).toBe("2026-08-01");
      expect(res.body.period.endDate).toBe("2026-08-07");
      expect(res.body.period.totalDays).toBe(7);

      // Total Expected = 7 (Habit 1) + 3 (Habit 2) = 10
      // Total Completed = 5 (Habit 1) + 2 (Habit 2) = 7
      // Completion Rate = 7 / 10 = 0.7
      expect(res.body.habits.totalExpected).toBe(10);
      expect(res.body.habits.totalCompleted).toBe(7);
      expect(res.body.habits.completionRate).toBe(0.7);

      // Focus aggregations: 50 + 25 + 10 = 85 mins
      expect(res.body.focus.totalFocusMinutes).toBe(85);
      expect(res.body.focus.totalSessionsCount).toBe(3);
      expect(res.body.focus.completedSessionsCount).toBe(2);
      expect(res.body.focus.abandonedSessionsCount).toBe(1);
      expect(res.body.focus.averageSessionMinutes).toBe(28.3);

      // Habit consistency list
      expect(res.body.habitConsistency).toHaveLength(2);
      const h1 = res.body.habitConsistency.find((h: any) => h.title === "Daily Morning Run");
      expect(h1.rangeExpected).toBe(7);
      expect(h1.rangeCompleted).toBe(5);
      expect(h1.rangeCompletionRate).toBe(0.71);

      const h2 = res.body.habitConsistency.find((h: any) => h.title === "Syllabus Review");
      expect(h2.rangeExpected).toBe(3);
      expect(h2.rangeCompleted).toBe(2);
      expect(h2.rangeCompletionRate).toBe(0.67);

      // Contiguous 7-day trend
      expect(res.body.trend).toHaveLength(7);
      expect(res.body.trend[0].date).toBe("2026-08-01");
      expect(res.body.trend[6].date).toBe("2026-08-07");
    });

    it("rejects invalid date range requests with 400 Bad Request", async () => {
      // Missing dates
      await request(app).get("/api/v1/analytics/productivity").expect(400);

      // Reversed dates (startDate > endDate)
      const res1 = await request(app)
        .get("/api/v1/analytics/productivity?startDate=2026-08-10&endDate=2026-08-01")
        .expect(400);
      expect(res1.body.error).toBe("ValidationError");

      // Range > 366 days
      const res2 = await request(app)
        .get("/api/v1/analytics/productivity?startDate=2024-01-01&endDate=2026-08-01")
        .expect(400);
      expect(res2.body.error).toBe("ValidationError");
    });
  });

  describe("2. Finance Analytics Endpoint (FR-12.2, FR-12.3)", () => {
    it("returns correct category breakdowns, income/expense totals, and budget adherence stats", async () => {
      // Seed transactions
      mockTransactions.push(
        {
          _id: new Types.ObjectId(),
          userId: testUserId,
          type: "income",
          category: "Salary",
          amount: 5000,
          date: new Date("2026-08-01T09:00:00.000Z")
        },
        {
          _id: new Types.ObjectId(),
          userId: testUserId,
          type: "expense",
          category: "Groceries",
          amount: 300,
          date: new Date("2026-08-03T11:00:00.000Z")
        },
        {
          _id: new Types.ObjectId(),
          userId: testUserId,
          type: "expense",
          category: "Dining Out",
          amount: 150,
          date: new Date("2026-08-04T19:00:00.000Z")
        },
        {
          _id: new Types.ObjectId(),
          userId: testUserId,
          type: "expense",
          category: "Utilities",
          amount: 50,
          date: new Date("2026-08-05T08:00:00.000Z")
        }
      );

      // Seed budgets
      mockBudgets.push(
        {
          _id: new Types.ObjectId(),
          userId: testUserId,
          category: "Groceries",
          limit: 400,
          period: "monthly"
        },
        {
          _id: new Types.ObjectId(),
          userId: testUserId,
          category: "Dining Out",
          limit: 100,
          period: "monthly"
        }
      );

      const res = await request(app)
        .get("/api/v1/analytics/finance?startDate=2026-08-01&endDate=2026-08-07")
        .expect(200);

      expect(res.body.summary.totalIncome).toBe(5000);
      expect(res.body.summary.totalExpense).toBe(500);
      expect(res.body.summary.netSavings).toBe(4500);
      expect(res.body.summary.savingsRate).toBe(90);
      expect(res.body.summary.transactionCount).toBe(4);

      // Category breakdown
      expect(res.body.categoryBreakdown).toHaveLength(4);
      const groc = res.body.categoryBreakdown.find((c: any) => c.category === "Groceries");
      expect(groc.totalAmount).toBe(300);
      expect(groc.percentage).toBe(60); // 300 / 500 = 60%

      // Budget adherence:
      // Groceries: $300 / $400 = 75% -> on_track
      // Dining Out: $150 / $100 = 150% -> exceeded
      expect(res.body.budgetAdherence.budgetsTracked).toBe(2);
      expect(res.body.budgetAdherence.budgetsOnTrack).toBe(1);
      expect(res.body.budgetAdherence.budgetsExceeded).toBe(1);
      expect(res.body.budgetAdherence.adherenceRate).toBe(0.5);

      const diningBudget = res.body.budgetAdherence.budgets.find(
        (b: any) => b.category === "Dining Out"
      );
      expect(diningBudget.status).toBe("exceeded");
      expect(diningBudget.isOverBudget).toBe(true);
      expect(diningBudget.percentUsed).toBe(150);
    });
  });

  describe("3. Export Generation (FR-12.4)", () => {
    it("generates valid CSV export for productivity with correct headers and attachment disposition", async () => {
      mockHabits.push({
        _id: new Types.ObjectId(),
        userId: testUserId,
        title: "Exercise, Workout",
        frequency: { type: "daily" },
        currentStreak: 3,
        longestStreak: 5,
        lastCheckInDate: "2026-08-05"
      });

      const res = await request(app)
        .get("/api/v1/analytics/export?type=productivity&format=csv&startDate=2026-08-01&endDate=2026-08-07")
        .expect(200);

      expect(res.headers["content-type"]).toContain("text/csv");
      expect(res.headers["content-disposition"]).toContain('attachment; filename="lifeos-productivity-2026-08-01-to-2026-08-07.csv"');

      const csvText = res.text;
      expect(csvText).toContain("LifeOS Productivity Analytics Report");
      expect(csvText).toContain("=== SUMMARY METRICS ===");
      expect(csvText).toContain("=== HABIT CONSISTENCY ===");
      // CSV escaping check for title with comma: "Exercise, Workout"
      expect(csvText).toContain('"Exercise, Workout"');
    });

    it("generates valid CSV export for finance", async () => {
      mockTransactions.push({
        _id: new Types.ObjectId(),
        userId: testUserId,
        type: "income",
        category: "Salary",
        amount: 3000,
        date: new Date("2026-08-01T10:00:00.000Z")
      });

      const res = await request(app)
        .get("/api/v1/analytics/export?type=finance&format=csv&startDate=2026-08-01&endDate=2026-08-07")
        .expect(200);

      expect(res.headers["content-type"]).toContain("text/csv");
      expect(res.headers["content-disposition"]).toContain('attachment; filename="lifeos-finance-2026-08-01-to-2026-08-07.csv"');
      expect(res.text).toContain("LifeOS Financial Analytics Report");
      expect(res.text).toContain("=== FINANCIAL SUMMARY ===");
      expect(res.text).toContain("Total Income,3000.00");
    });

    it("generates valid binary PDF export with %PDF- magic bytes header", async () => {
      const res = await request(app)
        .get("/api/v1/analytics/export?type=productivity&format=pdf&startDate=2026-08-01&endDate=2026-08-07")
        .expect(200);

      expect(res.headers["content-type"]).toBe("application/pdf");
      expect(res.headers["content-disposition"]).toContain('attachment; filename="lifeos-productivity-2026-08-01-to-2026-08-07.pdf"');

      const buffer = res.body;
      // Valid PDF begins with %PDF- (hex 25 50 44 46 2d)
      const pdfHeader = buffer.toString("utf8", 0, 5);
      expect(pdfHeader).toBe("%PDF-");
      expect(buffer.length).toBeGreaterThan(100);
    });

    it("generates valid binary PDF export for finance", async () => {
      const res = await request(app)
        .get("/api/v1/analytics/export?type=finance&format=pdf&startDate=2026-08-01&endDate=2026-08-07")
        .expect(200);

      expect(res.headers["content-type"]).toBe("application/pdf");
      expect(res.headers["content-disposition"]).toContain('attachment; filename="lifeos-finance-2026-08-01-to-2026-08-07.pdf"');

      const buffer = res.body;
      const pdfHeader = buffer.toString("utf8", 0, 5);
      expect(pdfHeader).toBe("%PDF-");
      expect(buffer.length).toBeGreaterThan(100);
    });

    it("enforces Redis rate limiting when exceeding export threshold", async () => {
      // Simulate exhausting rate limit for user (20 requests)
      const now = new Date();
      const hourKey = `${now.toISOString().split("T")[0]}-${now.getUTCHours()}`;
      const key = `ratelimit:export:${testUserId.toString()}:${hourKey}`;
      redisStore.set(key, 20); // 20 requests already consumed

      const res = await request(app)
        .get("/api/v1/analytics/export?type=productivity&format=csv&startDate=2026-08-01&endDate=2026-08-07")
        .expect(429);

      expect(res.body.error).toBe("TooManyRequests");
      expect(res.body.message).toContain("Export rate limit exceeded");
      expect(res.headers["retry-after"]).toBeDefined();
    });
  });
});
