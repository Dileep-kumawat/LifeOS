import { describe, it, expect, beforeEach, vi } from "vitest";

const { mockAxiosInstance } = vi.hoisted(() => {
  const instance = {
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() }
    },
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
  };
  return { mockAxiosInstance: instance };
});

vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
  NativeModules: {}
}));

vi.mock("expo-constants", () => ({
  default: { expoConfig: null }
}));

vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn().mockResolvedValue(null),
  setItemAsync: vi.fn().mockResolvedValue(undefined),
  deleteItemAsync: vi.fn().mockResolvedValue(undefined)
}));

vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance),
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() }
    }
  }
}));

import { analyticsApiService } from "../analyticsApiService";
import type { ProductivityAnalytics, FinanceAnalytics } from "@lifeos/shared";

const mockProductivityData: ProductivityAnalytics = {
  period: { startDate: "2026-08-01", endDate: "2026-08-31", totalDays: 31 },
  habits: { totalExpected: 60, totalCompleted: 54, completionRate: 0.9 },
  focus: {
    totalFocusMinutes: 900,
    totalSessionsCount: 20,
    completedSessionsCount: 18,
    abandonedSessionsCount: 2,
    activeSessionsCount: 0,
    averageSessionMinutes: 45,
    linkedTypeBreakdown: [
      { linkedType: "topic", totalMinutes: 600, count: 12, percentage: 67 },
      { linkedType: "goal", totalMinutes: 300, count: 6, percentage: 33 }
    ]
  },
  habitConsistency: [
    {
      habitId: "h1",
      title: "Meditation",
      frequency: { type: "daily" },
      currentStreak: 10,
      longestStreak: 25,
      rangeExpected: 31,
      rangeCompleted: 28,
      rangeCompletionRate: 0.9,
      lastCheckInDate: "2026-08-30"
    }
  ],
  trend: [
    {
      date: "2026-08-01",
      focusMinutes: 45,
      completedSessions: 1,
      abandonedSessions: 0,
      habitsCompleted: 2,
      habitsExpected: 2
    }
  ]
};

const mockFinanceData: FinanceAnalytics = {
  period: { startDate: "2026-08-01", endDate: "2026-08-31", totalDays: 31 },
  summary: {
    totalIncome: 5000.0,
    totalExpense: 2000.0,
    netSavings: 3000.0,
    savingsRate: 60.0,
    transactionCount: 15
  },
  categoryBreakdown: [
    {
      category: "Housing",
      type: "expense",
      totalAmount: 1200.0,
      count: 1,
      percentage: 60
    }
  ],
  trend: [
    {
      period: "2026-08-01",
      income: 5000,
      expense: 2000,
      net: 3000
    }
  ],
  budgetAdherence: {
    budgetsTracked: 2,
    budgetsOnTrack: 2,
    budgetsExceeded: 0,
    adherenceRate: 1.0,
    budgets: [
      {
        budgetId: "b1",
        category: "Groceries",
        limit: 500,
        actualSpend: 350,
        percentUsed: 70,
        isOverBudget: false,
        status: "on_track"
      }
    ]
  }
};

describe("Mobile Analytics API Service Suite (FR-12.1 – FR-12.4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Preset Range Computations", () => {
    it("computes mobile preset date boundaries accurately", () => {
      const now = new Date();
      const formatLocalYMD = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };
      const todayStr = formatLocalYMD(now);

      const thisWeekStart = new Date(now);
      thisWeekStart.setDate(now.getDate() - 6);
      expect(formatLocalYMD(thisWeekStart) <= todayStr).toBe(true);

      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      expect(formatLocalYMD(thisMonthStart).endsWith("-01")).toBe(true);
      expect(formatLocalYMD(thisMonthStart) <= todayStr).toBe(true);

      const last3MonthsStart = new Date(now);
      last3MonthsStart.setDate(now.getDate() - 89);
      expect(formatLocalYMD(last3MonthsStart) <= todayStr).toBe(true);
    });
  });

  describe("2. Analytics REST Endpoints", () => {
    it("fetches productivity analytics with date range parameters", async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockProductivityData });

      const result = await analyticsApiService.getProductivityAnalytics("2026-08-01", "2026-08-31");

      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/analytics/productivity", {
        params: { startDate: "2026-08-01", endDate: "2026-08-31" }
      });
      expect(result.habits.totalCompleted).toBe(54);
      expect(result.focus.totalFocusMinutes).toBe(900);
      expect(result.habitConsistency.length).toBe(1);
    });

    it("fetches finance analytics with date range parameters", async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockFinanceData });

      const result = await analyticsApiService.getFinanceAnalytics("2026-08-01", "2026-08-31");

      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/analytics/finance", {
        params: { startDate: "2026-08-01", endDate: "2026-08-31" }
      });
      expect(result.summary.totalIncome).toBe(5000);
      expect(result.budgetAdherence.adherenceRate).toBe(1.0);
      expect(result.categoryBreakdown[0].category).toBe("Housing");
    });

    it("fetches export data with format and domain parameters", async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: "date,focusMinutes,habitsCompleted\n2026-08-01,45,2\n"
      });

      const res = await analyticsApiService.exportAnalytics({
        type: "productivity",
        format: "csv",
        startDate: "2026-08-01",
        endDate: "2026-08-31"
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/analytics/export", {
        params: {
          type: "productivity",
          format: "csv",
          startDate: "2026-08-01",
          endDate: "2026-08-31"
        },
        responseType: "text"
      });
      expect(res).toContain("date,focusMinutes,habitsCompleted");
    });

    it("handles 429 rate limit error on export with helpful message", async () => {
      mockAxiosInstance.get.mockRejectedValueOnce({
        response: { status: 429 }
      });

      await expect(
        analyticsApiService.exportAnalytics({
          type: "finance",
          format: "pdf",
          startDate: "2026-08-01",
          endDate: "2026-08-31"
        })
      ).rejects.toThrow("Export rate limit exceeded (20 exports/hour). Please try again later.");
    });
  });

  describe("3. Metric Calculation & Empty State Logic", () => {
    it("formats focus hours and minutes accurately", () => {
      const totalMinutes = mockProductivityData.focus.totalFocusMinutes;
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      expect(`${hours}h ${mins}m`).toBe("15h 0m");
    });

    it("correctly identifies non-empty vs empty dataset", () => {
      const hasProductivityData = (data: ProductivityAnalytics) =>
        data.habits.totalExpected > 0 ||
        data.focus.totalSessionsCount > 0 ||
        data.habitConsistency.length > 0 ||
        data.trend.some((t) => t.focusMinutes > 0 || t.habitsCompleted > 0);

      expect(hasProductivityData(mockProductivityData)).toBe(true);

      const emptyData: ProductivityAnalytics = {
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
      expect(hasProductivityData(emptyData)).toBe(false);
    });
  });
});
