import { z } from "zod";

/**
 * Validates ISO / YYYY-MM-DD date strings and enforces range boundaries (<= 366 days).
 */
export const analyticsDateRangeSchema = z
  .object({
    startDate: z
      .string({ required_error: "startDate is required" })
      .regex(/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?)?$/, "startDate must be YYYY-MM-DD or ISO date string"),
    endDate: z
      .string({ required_error: "endDate is required" })
      .regex(/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?)?$/, "endDate must be YYYY-MM-DD or ISO date string")
  })
  .refine(
    (data) => {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      return !isNaN(start.getTime()) && !isNaN(end.getTime()) && start.getTime() <= end.getTime();
    },
    {
      message: "startDate must be before or equal to endDate and must be valid dates",
      path: ["startDate"]
    }
  )
  .refine(
    (data) => {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      const diffMs = end.getTime() - start.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      return diffDays <= 366;
    },
    {
      message: "Date range cannot exceed 366 days (1 year)",
      path: ["endDate"]
    }
  );

export type AnalyticsDateRangeQuery = z.infer<typeof analyticsDateRangeSchema>;

export const analyticsExportQuerySchema = z
  .object({
    type: z.enum(["productivity", "finance"], {
      required_error: "type is required (productivity | finance)"
    }),
    format: z.enum(["csv", "pdf"], {
      required_error: "format is required (csv | pdf)"
    }),
    startDate: z
      .string({ required_error: "startDate is required" })
      .regex(/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?)?$/, "startDate must be YYYY-MM-DD or ISO date string"),
    endDate: z
      .string({ required_error: "endDate is required" })
      .regex(/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?)?$/, "endDate must be YYYY-MM-DD or ISO date string")
  })
  .refine(
    (data) => {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      return !isNaN(start.getTime()) && !isNaN(end.getTime()) && start.getTime() <= end.getTime();
    },
    {
      message: "startDate must be before or equal to endDate and must be valid dates",
      path: ["startDate"]
    }
  )
  .refine(
    (data) => {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      const diffMs = end.getTime() - start.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      return diffDays <= 366;
    },
    {
      message: "Date range cannot exceed 366 days (1 year)",
      path: ["endDate"]
    }
  );

export type AnalyticsExportQuery = z.infer<typeof analyticsExportQuerySchema>;

// ─── Analytics Response Interfaces ──────────────────────────────────────────

export interface HabitConsistencyStat {
  habitId: string;
  title: string;
  frequency: {
    type: "daily" | "weekly" | "custom";
    daysOfWeek?: number[];
    timesPerPeriod?: number;
  };
  currentStreak: number;
  longestStreak: number;
  rangeExpected: number;
  rangeCompleted: number;
  rangeCompletionRate: number; // 0.0 to 1.0
  lastCheckInDate: string | null;
}

export interface ProductivityDailyTrendItem {
  date: string; // YYYY-MM-DD
  focusMinutes: number;
  completedSessions: number;
  abandonedSessions: number;
  habitsCompleted: number;
  habitsExpected: number;
}

export interface ProductivityAnalytics {
  period: {
    startDate: string;
    endDate: string;
    totalDays: number;
  };
  habits: {
    totalExpected: number;
    totalCompleted: number;
    completionRate: number; // 0.0 to 1.0
  };
  focus: {
    totalFocusMinutes: number;
    totalSessionsCount: number;
    completedSessionsCount: number;
    abandonedSessionsCount: number;
    activeSessionsCount: number;
    averageSessionMinutes: number;
    linkedTypeBreakdown: Array<{
      linkedType: "topic" | "goal" | "task" | "none";
      totalMinutes: number;
      count: number;
      percentage: number;
    }>;
  };
  habitConsistency: HabitConsistencyStat[];
  trend: ProductivityDailyTrendItem[];
}

export interface FinanceCategoryBreakdownItem {
  category: string;
  type: "income" | "expense";
  totalAmount: number;
  count: number;
  percentage: number;
}

export interface FinanceTrendItem {
  period: string; // YYYY-MM-DD or YYYY-MM
  income: number;
  expense: number;
  net: number;
}

export interface BudgetAdherenceItem {
  budgetId: string;
  category: string;
  limit: number;
  actualSpend: number;
  percentUsed: number;
  isOverBudget: boolean;
  status: "on_track" | "warning" | "exceeded";
}

export interface FinanceAnalytics {
  period: {
    startDate: string;
    endDate: string;
    totalDays: number;
  };
  summary: {
    totalIncome: number;
    totalExpense: number;
    netSavings: number;
    savingsRate: number; // percentage (e.g. 0.0 - 100.0)
    transactionCount: number;
  };
  categoryBreakdown: FinanceCategoryBreakdownItem[];
  trend: FinanceTrendItem[];
  budgetAdherence: {
    budgetsTracked: number;
    budgetsOnTrack: number;
    budgetsExceeded: number;
    adherenceRate: number; // 0.0 to 1.0
    budgets: BudgetAdherenceItem[];
  };
}
