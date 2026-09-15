import { describe, it, expect, vi, beforeEach } from "vitest";
import { Types } from "mongoose";
import {
  normalizeDateBounds,
  calculateExpectedHabitCount
} from "../productivityAnalyticsService.js";
import { getMonthBounds } from "../../budgetService.js";
import { getFinanceAnalytics } from "../financeAnalyticsService.js";

// Mock Transaction and Budget models for getFinanceAnalytics tests
const mockAggregate = vi.fn();
const mockBudgetFind = vi.fn();

vi.mock("../../../models/Transaction.js", () => ({
  Transaction: {
    aggregate: (...args: any[]) => mockAggregate(...args)
  }
}));

vi.mock("../../../models/Budget.js", () => ({
  Budget: {
    find: (...args: any[]) => mockBudgetFind(...args)
  }
}));

vi.mock("../../notifications/scheduler.js", () => ({
  scheduleNotification: vi.fn().mockResolvedValue("mock-notif-id")
}));

describe("Finance Analytics Logic, Normalization & Pro-ration", () => {
  const userId = new Types.ObjectId("662c9f1e9f0b2a001c3d4e0a");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Date Bounds Normalization (normalizeDateBounds)", () => {
    it("normalizes standard YYYY-MM-DD date strings to UTC boundaries", () => {
      const { startBound, endBound, startDateIso, endDateIso, totalDays } =
        normalizeDateBounds("2026-08-01", "2026-08-31");

      expect(startDateIso).toBe("2026-08-01");
      expect(endDateIso).toBe("2026-08-31");
      expect(startBound.toISOString()).toBe("2026-08-01T00:00:00.000Z");
      expect(endBound.toISOString()).toBe("2026-08-31T23:59:59.999Z");
      expect(totalDays).toBe(31);
    });

    it("normalizes full ISO strings by extracting date part", () => {
      const { startBound, endBound, startDateIso, endDateIso, totalDays } =
        normalizeDateBounds("2026-02-01T10:30:00.000Z", "2026-02-28T18:45:00.000Z");

      expect(startDateIso).toBe("2026-02-01");
      expect(endDateIso).toBe("2026-02-28");
      expect(startBound.toISOString()).toBe("2026-02-01T00:00:00.000Z");
      expect(endBound.toISOString()).toBe("2026-02-28T23:59:59.999Z");
      expect(totalDays).toBe(28); // 2026 is non-leap year
    });

    it("handles single-day date range with totalDays = 1", () => {
      const { startBound, endBound, totalDays } =
        normalizeDateBounds("2026-08-15", "2026-08-15");

      expect(startBound.toISOString()).toBe("2026-08-15T00:00:00.000Z");
      expect(endBound.toISOString()).toBe("2026-08-15T23:59:59.999Z");
      expect(totalDays).toBe(1);
    });
  });

  describe("Habit Quota Pro-ration Across Date Windows (calculateExpectedHabitCount)", () => {
    it("pro-rates daily habits to exact number of calendar days in range", () => {
      const result = calculateExpectedHabitCount(
        { type: "daily" },
        "2026-08-01",
        "2026-08-10"
      );

      expect(result.expectedCount).toBe(10);
      expect(result.expectedDates.size).toBe(10);
      expect(result.expectedDates.has("2026-08-01")).toBe(true);
      expect(result.expectedDates.has("2026-08-10")).toBe(true);
    });

    it("pro-rates weekly habit with specific daysOfWeek to exact occurrences in window", () => {
      // 2026-08-03 is Monday (1), 2026-08-05 is Wednesday (3), 2026-08-07 is Friday (5)
      // Range: Monday 2026-08-03 to Sunday 2026-08-09 (1 full week) -> exactly 3
      const oneWeek = calculateExpectedHabitCount(
        { type: "weekly", daysOfWeek: [1, 3, 5] },
        "2026-08-03",
        "2026-08-09"
      );
      expect(oneWeek.expectedCount).toBe(3);

      // Range: Monday 2026-08-03 to Thursday 2026-08-06 (Mon, Tue, Wed, Thu) -> Mon & Wed = 2
      const partialWeek = calculateExpectedHabitCount(
        { type: "weekly", daysOfWeek: [1, 3, 5] },
        "2026-08-03",
        "2026-08-06"
      );
      expect(partialWeek.expectedCount).toBe(2);
      expect(partialWeek.expectedDates.has("2026-08-03")).toBe(true);
      expect(partialWeek.expectedDates.has("2026-08-05")).toBe(true);
      expect(partialWeek.expectedDates.has("2026-08-07")).toBe(false);
    });

    it("pro-rates weekly habit without specific days using ceil(days / 7)", () => {
      // 7 days -> 1 occurrence
      expect(
        calculateExpectedHabitCount({ type: "weekly" }, "2026-08-01", "2026-08-07").expectedCount
      ).toBe(1);

      // 10 days -> ceil(10 / 7) = 2 occurrences
      expect(
        calculateExpectedHabitCount({ type: "weekly" }, "2026-08-01", "2026-08-10").expectedCount
      ).toBe(2);

      // 30 days -> ceil(30 / 7) = 5 occurrences
      expect(
        calculateExpectedHabitCount({ type: "weekly" }, "2026-08-01", "2026-08-30").expectedCount
      ).toBe(5);
    });

    it("pro-rates custom habit timesPerPeriod using ceil((days / 7) * quota)", () => {
      // 3 times per week over 14 days -> ceil(14/7 * 3) = 6
      expect(
        calculateExpectedHabitCount(
          { type: "custom", timesPerPeriod: 3 },
          "2026-08-01",
          "2026-08-14"
        ).expectedCount
      ).toBe(6);

      // 3 times per week over 10 days -> ceil(10/7 * 3) = ceil(4.285) = 5
      expect(
        calculateExpectedHabitCount(
          { type: "custom", timesPerPeriod: 3 },
          "2026-08-01",
          "2026-08-10"
        ).expectedCount
      ).toBe(5);
    });
  });

  describe("Month Boundaries (getMonthBounds)", () => {
    it("computes exact start and end of month for leap and non-leap February", () => {
      // Non-leap year: 2026-02-15
      const bounds2026 = getMonthBounds(new Date("2026-02-15T12:00:00.000Z"));
      expect(bounds2026.startOfMonth.toISOString()).toBe("2026-02-01T00:00:00.000Z");
      expect(bounds2026.endOfMonth.toISOString()).toBe("2026-02-28T23:59:59.999Z");

      // Leap year: 2024-02-15
      const bounds2024 = getMonthBounds(new Date("2024-02-15T12:00:00.000Z"));
      expect(bounds2024.startOfMonth.toISOString()).toBe("2024-02-01T00:00:00.000Z");
      expect(bounds2024.endOfMonth.toISOString()).toBe("2024-02-29T23:59:59.999Z");
    });

    it("computes exact start and end for 30-day and 31-day months", () => {
      const boundsApril = getMonthBounds(new Date("2026-04-10T12:00:00.000Z"));
      expect(boundsApril.endOfMonth.toISOString()).toBe("2026-04-30T23:59:59.999Z");

      const boundsAugust = getMonthBounds(new Date("2026-08-20T12:00:00.000Z"));
      expect(boundsAugust.endOfMonth.toISOString()).toBe("2026-08-31T23:59:59.999Z");
    });
  });

  describe("Finance Analytics Aggregation & Category Normalization (getFinanceAnalytics)", () => {
    it("normalizes categories case-insensitively and accumulates multiple casing variants into budget", async () => {
      // Mock category breakdown with mixed casing for 'Dining Out'
      const mockCategoryAgg = [
        { _id: { category: "Dining Out", type: "expense" }, totalAmount: 120, count: 2 },
        { _id: { category: "dining out", type: "expense" }, totalAmount: 80, count: 1 },
        { _id: { category: "DINING OUT", type: "expense" }, totalAmount: 50, count: 1 },
        { _id: { category: "Salary", type: "income" }, totalAmount: 3000, count: 1 }
      ];

      // Trend aggregation
      const mockTrendAgg = [
        { _id: { period: "2026-08-01", type: "expense" }, totalAmount: 250 },
        { _id: { period: "2026-08-01", type: "income" }, totalAmount: 3000 }
      ];

      // 1 budget for 'Dining Out' with limit 200
      const mockBudgets = [
        {
          _id: new Types.ObjectId("662c9f1e9f0b2a001c3d4e30"),
          category: "Dining Out",
          limit: 200
        }
      ];

      mockAggregate
        .mockResolvedValueOnce(mockCategoryAgg) // Category aggregation call
        .mockResolvedValueOnce(mockTrendAgg); // Trend aggregation call

      mockBudgetFind.mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockBudgets)
      });

      const result = await getFinanceAnalytics(userId, "2026-08-01", "2026-08-05");

      // Verify that 'Dining Out', 'dining out', and 'DINING OUT' were ALL accumulated together
      // Total spend = 120 + 80 + 50 = 250
      expect(result.budgetAdherence.budgetsTracked).toBe(1);
      const adherence = result.budgetAdherence.budgets[0];
      expect(adherence.actualSpend).toBe(250);
      expect(adherence.limit).toBe(200);
      expect(adherence.percentUsed).toBe(125); // 250 / 200 * 100 = 125%
      expect(adherence.isOverBudget).toBe(true);
      expect(adherence.status).toBe("exceeded");
      expect(result.budgetAdherence.budgetsExceeded).toBe(1);
      expect(result.budgetAdherence.budgetsOnTrack).toBe(0);
      expect(result.budgetAdherence.adherenceRate).toBe(0);
    });

    it("evaluates budget adherence warning threshold (>= 85%) and on_track threshold (< 85%)", async () => {
      const mockCategoryAgg = [
        { _id: { category: "Groceries", type: "expense" }, totalAmount: 180, count: 3 }, // 180 / 200 = 90% -> warning
        { _id: { category: "Utilities", type: "expense" }, totalAmount: 80, count: 1 }, // 80 / 150 = 53% -> on_track
        { _id: { category: "Entertainment", type: "expense" }, totalAmount: 120, count: 2 } // 120 / 100 = 120% -> exceeded
      ];

      mockAggregate
        .mockResolvedValueOnce(mockCategoryAgg)
        .mockResolvedValueOnce([]);

      const mockBudgets = [
        { _id: new Types.ObjectId("662c9f1e9f0b2a001c3d4e31"), category: "Utilities", limit: 150 },
        { _id: new Types.ObjectId("662c9f1e9f0b2a001c3d4e32"), category: "Groceries", limit: 200 },
        { _id: new Types.ObjectId("662c9f1e9f0b2a001c3d4e33"), category: "Entertainment", limit: 100 }
      ];

      mockBudgetFind.mockReturnValue({
        lean: vi.fn().mockResolvedValue(mockBudgets)
      });

      const result = await getFinanceAnalytics(userId, "2026-08-01", "2026-08-10");

      expect(result.budgetAdherence.budgetsTracked).toBe(3);
      expect(result.budgetAdherence.budgetsExceeded).toBe(1);
      expect(result.budgetAdherence.budgetsOnTrack).toBe(2);
      expect(result.budgetAdherence.adherenceRate).toBe(0.67); // 2/3 = 0.6666... rounded to 0.67

      // Verify sorting: exceeded item surfaced first, then highest percent used
      expect(result.budgetAdherence.budgets[0].category).toBe("Entertainment");
      expect(result.budgetAdherence.budgets[0].status).toBe("exceeded");
      expect(result.budgetAdherence.budgets[0].percentUsed).toBe(120);

      expect(result.budgetAdherence.budgets[1].category).toBe("Groceries");
      expect(result.budgetAdherence.budgets[1].status).toBe("warning");
      expect(result.budgetAdherence.budgets[1].percentUsed).toBe(90);

      expect(result.budgetAdherence.budgets[2].category).toBe("Utilities");
      expect(result.budgetAdherence.budgets[2].status).toBe("on_track");
      expect(result.budgetAdherence.budgets[2].percentUsed).toBe(53);
    });

    it("returns adherenceRate of 1.0 when user has no active budgets configured", async () => {
      mockAggregate
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      mockBudgetFind.mockReturnValue({
        lean: vi.fn().mockResolvedValue([])
      });

      const result = await getFinanceAnalytics(userId, "2026-08-01", "2026-08-15");

      expect(result.budgetAdherence.budgetsTracked).toBe(0);
      expect(result.budgetAdherence.budgetsOnTrack).toBe(0);
      expect(result.budgetAdherence.budgetsExceeded).toBe(0);
      expect(result.budgetAdherence.adherenceRate).toBe(1.0);
      expect(result.budgetAdherence.budgets).toEqual([]);
    });

    it("pro-rates category percentage of total and calculates savings rate correctly", async () => {
      const mockCategoryAgg = [
        { _id: { category: "Salary", type: "income" }, totalAmount: 4000, count: 1 },
        { _id: { category: "Freelance", type: "income" }, totalAmount: 1000, count: 1 },
        { _id: { category: "Rent", type: "expense" }, totalAmount: 1500, count: 1 },
        { _id: { category: "Food", type: "expense" }, totalAmount: 500, count: 4 }
      ];

      mockAggregate
        .mockResolvedValueOnce(mockCategoryAgg)
        .mockResolvedValueOnce([]);

      mockBudgetFind.mockReturnValue({
        lean: vi.fn().mockResolvedValue([])
      });

      const result = await getFinanceAnalytics(userId, "2026-08-01", "2026-08-31");

      // Total Income = 5000, Total Expense = 2000, Net = 3000
      expect(result.summary.totalIncome).toBe(5000);
      expect(result.summary.totalExpense).toBe(2000);
      expect(result.summary.netSavings).toBe(3000);
      // Savings rate = (3000 / 5000) * 100 = 60%
      expect(result.summary.savingsRate).toBe(60);

      // Verify category percentages
      const rent = result.categoryBreakdown.find((c) => c.category === "Rent");
      expect(rent?.percentage).toBe(75); // 1500 / 2000 = 75%

      const food = result.categoryBreakdown.find((c) => c.category === "Food");
      expect(food?.percentage).toBe(25); // 500 / 2000 = 25%

      const salary = result.categoryBreakdown.find((c) => c.category === "Salary");
      expect(salary?.percentage).toBe(80); // 4000 / 5000 = 80%

      const freelance = result.categoryBreakdown.find((c) => c.category === "Freelance");
      expect(freelance?.percentage).toBe(20); // 1000 / 5000 = 20%
    });

    it("clamps savingsRate to 0 when expenses exceed income or income is 0", async () => {
      const mockCategoryAgg = [
        { _id: { category: "Medical", type: "expense" }, totalAmount: 800, count: 1 },
        { _id: { category: "Side Gig", type: "income" }, totalAmount: 500, count: 1 }
      ];

      mockAggregate
        .mockResolvedValueOnce(mockCategoryAgg)
        .mockResolvedValueOnce([]);

      mockBudgetFind.mockReturnValue({
        lean: vi.fn().mockResolvedValue([])
      });

      const result = await getFinanceAnalytics(userId, "2026-08-01", "2026-08-05");

      // Net = 500 - 800 = -300
      expect(result.summary.netSavings).toBe(-300);
      // Savings rate must not be negative; clamped at 0
      expect(result.summary.savingsRate).toBe(0);
    });

    it("zero-fills daily intervals for ranges <= 31 days", async () => {
      // 5-day range from 2026-08-01 to 2026-08-05
      // Only 2026-08-02 has transactions
      const mockTrendAgg = [
        { _id: { period: "2026-08-02", type: "expense" }, totalAmount: 45.5 }
      ];

      mockAggregate
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(mockTrendAgg);

      mockBudgetFind.mockReturnValue({
        lean: vi.fn().mockResolvedValue([])
      });

      const result = await getFinanceAnalytics(userId, "2026-08-01", "2026-08-05");

      // Trend should contain all 5 days sequentially
      expect(result.trend).toHaveLength(5);
      expect(result.trend.map((t) => t.period)).toEqual([
        "2026-08-01",
        "2026-08-02",
        "2026-08-03",
        "2026-08-04",
        "2026-08-05"
      ]);

      // Day 1 has 0 expense, Day 2 has 45.5, Day 3 has 0
      expect(result.trend[0].expense).toBe(0);
      expect(result.trend[1].expense).toBe(45.5);
      expect(result.trend[1].net).toBe(-45.5);
      expect(result.trend[2].expense).toBe(0);
    });
  });
});
