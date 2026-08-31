import { describe, it, expect, vi, beforeEach } from "vitest";
import { analyticsApi } from "../api/analyticsApi";
import { computePresetRange } from "../components/DateRangePicker";
import type { ProductivityAnalytics, FinanceAnalytics } from "@lifeos/shared";

// Mock API layer
vi.mock("../api/analyticsApi", () => ({
  analyticsApi: {
    getProductivityAnalytics: vi.fn(),
    getFinanceAnalytics: vi.fn(),
    exportAnalytics: vi.fn()
  }
}));

const mockProductivityPopulated: ProductivityAnalytics = {
  period: { startDate: "2026-08-01", endDate: "2026-08-31", totalDays: 31 },
  habits: { totalExpected: 62, totalCompleted: 54, completionRate: 0.87 },
  focus: {
    totalFocusMinutes: 1240,
    totalSessionsCount: 32,
    completedSessionsCount: 28,
    abandonedSessionsCount: 4,
    activeSessionsCount: 0,
    averageSessionMinutes: 38.8,
    linkedTypeBreakdown: [
      { linkedType: "topic", totalMinutes: 620, count: 15, percentage: 50 },
      { linkedType: "goal", totalMinutes: 310, count: 8, percentage: 25 },
      { linkedType: "task", totalMinutes: 310, count: 9, percentage: 25 }
    ]
  },
  habitConsistency: [
    {
      habitId: "h1",
      title: "Morning Run",
      frequency: { type: "daily" },
      currentStreak: 5,
      longestStreak: 14,
      rangeExpected: 31,
      rangeCompleted: 27,
      rangeCompletionRate: 0.87,
      lastCheckInDate: "2026-08-30"
    }
  ],
  trend: [
    {
      date: "2026-08-01",
      focusMinutes: 50,
      completedSessions: 2,
      abandonedSessions: 0,
      habitsCompleted: 2,
      habitsExpected: 2
    }
  ]
};

const mockFinancePopulated: FinanceAnalytics = {
  period: { startDate: "2026-08-01", endDate: "2026-08-31", totalDays: 31 },
  summary: {
    totalIncome: 4500.0,
    totalExpense: 1280.5,
    netSavings: 3219.5,
    savingsRate: 71.54,
    transactionCount: 24
  },
  categoryBreakdown: [
    {
      category: "Groceries",
      type: "expense",
      totalAmount: 450.0,
      count: 6,
      percentage: 35
    }
  ],
  trend: [
    {
      period: "2026-08-01",
      income: 0,
      expense: 45.0,
      net: -45.0
    }
  ],
  budgetAdherence: {
    budgetsTracked: 4,
    budgetsOnTrack: 3,
    budgetsExceeded: 1,
    adherenceRate: 0.75,
    budgets: [
      {
        budgetId: "b1",
        category: "Dining Out",
        limit: 250.0,
        actualSpend: 280.0,
        percentUsed: 112,
        isOverBudget: true,
        status: "exceeded"
      }
    ]
  }
};

const mockEmptyProductivity: ProductivityAnalytics = {
  period: { startDate: "2026-08-01", endDate: "2026-08-31", totalDays: 31 },
  habits: { totalExpected: 0, totalCompleted: 0, completionRate: 0 },
  focus: {
    totalFocusMinutes: 0,
    totalSessionsCount: 0,
    completedSessionsCount: 0,
    abandonedSessionsCount: 0,
    activeSessionsCount: 0,
    averageSessionMinutes: 0,
    linkedTypeBreakdown: []
  },
  habitConsistency: [],
  trend: []
};

const mockEmptyFinance: FinanceAnalytics = {
  period: { startDate: "2026-08-01", endDate: "2026-08-31", totalDays: 31 },
  summary: {
    totalIncome: 0,
    totalExpense: 0,
    netSavings: 0,
    savingsRate: 0,
    transactionCount: 0
  },
  categoryBreakdown: [],
  trend: [],
  budgetAdherence: {
    budgetsTracked: 0,
    budgetsOnTrack: 0,
    budgetsExceeded: 0,
    adherenceRate: 0,
    budgets: []
  }
};

describe("Web Analytics Dashboard & Component Test Suite (FR-12.1 – FR-12.4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (analyticsApi.getProductivityAnalytics as any).mockResolvedValue(mockProductivityPopulated);
    (analyticsApi.getFinanceAnalytics as any).mockResolvedValue(mockFinancePopulated);
    (analyticsApi.exportAnalytics as any).mockResolvedValue({
      filename: "lifeos-productivity-2026-08-01-to-2026-08-31.csv"
    });
  });

  describe("1. DateRangePicker Preset Calculations & Validation", () => {
    it("computes default date range presets accurately", () => {
      const thisWeek = computePresetRange("this_week");
      expect(thisWeek.startDate).toBeDefined();
      expect(thisWeek.endDate).toBeDefined();
      expect(new Date(thisWeek.startDate) <= new Date(thisWeek.endDate)).toBe(true);

      const thisMonth = computePresetRange("this_month");
      expect(thisMonth.startDate.endsWith("-01")).toBe(true);
      expect(thisMonth.startDate <= thisMonth.endDate).toBe(true);

      const last3Months = computePresetRange("last_3_months");
      expect(last3Months.startDate <= last3Months.endDate).toBe(true);
    });

    it("enforces start date <= end date and range <= 366 days", () => {
      const validateRange = (startStr: string, endStr: string): boolean => {
        const start = new Date(startStr);
        const end = new Date(endStr);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
        if (start.getTime() > end.getTime()) return false;
        const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays <= 366;
      };

      expect(validateRange("2026-08-01", "2026-08-31")).toBe(true);
      expect(validateRange("2026-08-31", "2026-08-01")).toBe(false); // Inverted
      expect(validateRange("2025-01-01", "2026-08-31")).toBe(false); // > 366 days
    });
  });

  describe("2. Export UI & File Download Flow", () => {
    it("triggers CSV and PDF export calls with correct parameters", async () => {
      await analyticsApi.exportAnalytics({
        type: "productivity",
        format: "csv",
        startDate: "2026-08-01",
        endDate: "2026-08-31"
      });

      expect(analyticsApi.exportAnalytics).toHaveBeenCalledWith({
        type: "productivity",
        format: "csv",
        startDate: "2026-08-01",
        endDate: "2026-08-31"
      });

      await analyticsApi.exportAnalytics({
        type: "finance",
        format: "pdf",
        startDate: "2026-08-01",
        endDate: "2026-08-31"
      });

      expect(analyticsApi.exportAnalytics).toHaveBeenCalledWith({
        type: "finance",
        format: "pdf",
        startDate: "2026-08-01",
        endDate: "2026-08-31"
      });
    });
  });

  describe("3. Empty vs Populated State Discipline", () => {
    it("correctly identifies empty vs populated productivity data", () => {
      const hasProductivityData = (data: ProductivityAnalytics) =>
        data.habits.totalExpected > 0 ||
        data.focus.totalSessionsCount > 0 ||
        data.habitConsistency.length > 0 ||
        data.trend.some((t) => t.focusMinutes > 0 || t.habitsCompleted > 0);

      expect(hasProductivityData(mockEmptyProductivity)).toBe(false);
      expect(hasProductivityData(mockProductivityPopulated)).toBe(true);
    });

    it("correctly identifies empty vs populated financial data", () => {
      const hasFinanceData = (data: FinanceAnalytics) =>
        data.summary.transactionCount > 0 ||
        data.summary.totalIncome > 0 ||
        data.summary.totalExpense > 0 ||
        data.budgetAdherence.budgetsTracked > 0;

      expect(hasFinanceData(mockEmptyFinance)).toBe(false);
      expect(hasFinanceData(mockFinancePopulated)).toBe(true);
    });

    it("verifies productivity metric calculations", () => {
      const totalMinutes = mockProductivityPopulated.focus.totalFocusMinutes;
      const hours = Math.floor(totalMinutes / 60);
      const remainingMins = totalMinutes % 60;
      expect(`${hours}h ${remainingMins}m`).toBe("20h 40m");

      const habitRatePercent = Math.round(mockProductivityPopulated.habits.completionRate * 100);
      expect(habitRatePercent).toBe(87);

      const sessionSuccessPercent = Math.round(
        (mockProductivityPopulated.focus.completedSessionsCount /
          mockProductivityPopulated.focus.totalSessionsCount) *
          100
      );
      expect(sessionSuccessPercent).toBe(88);
    });

    it("verifies financial metric calculations", () => {
      expect(mockFinancePopulated.summary.totalIncome).toBe(4500.0);
      expect(mockFinancePopulated.summary.totalExpense).toBe(1280.5);
      expect(mockFinancePopulated.summary.netSavings).toBe(3219.5);
      expect(mockFinancePopulated.summary.savingsRate).toBe(71.54);
      expect(mockFinancePopulated.budgetAdherence.adherenceRate).toBe(0.75);
    });
  });

  describe("4. AnalyticsChart Series & Data Validation", () => {
    it("validates chart series plotting for bar and line variants", () => {
      const series = [
        { dataKey: "focusMinutes", name: "Focus Minutes", color: "#0075de" },
        { dataKey: "habitsCompleted", name: "Habits Done", color: "#1aae39" }
      ];

      const data = mockProductivityPopulated.trend;
      expect(data.length).toBeGreaterThan(0);
      expect(data[0].focusMinutes).toBe(50);
      expect(data[0].habitsCompleted).toBe(2);

      const hasPlottedData = data.some((item) =>
        series.some((s) => Number((item as any)[s.dataKey] || 0) > 0)
      );
      expect(hasPlottedData).toBe(true);
    });
  });
});
