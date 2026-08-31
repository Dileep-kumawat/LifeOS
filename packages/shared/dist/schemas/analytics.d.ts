import { z } from "zod";
/**
 * Validates ISO / YYYY-MM-DD date strings and enforces range boundaries (<= 366 days).
 */
export declare const analyticsDateRangeSchema: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    startDate: z.ZodString;
    endDate: z.ZodString;
}, "strip", z.ZodTypeAny, {
    startDate: string;
    endDate: string;
}, {
    startDate: string;
    endDate: string;
}>, {
    startDate: string;
    endDate: string;
}, {
    startDate: string;
    endDate: string;
}>, {
    startDate: string;
    endDate: string;
}, {
    startDate: string;
    endDate: string;
}>;
export type AnalyticsDateRangeQuery = z.infer<typeof analyticsDateRangeSchema>;
export declare const analyticsExportQuerySchema: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    type: z.ZodEnum<["productivity", "finance"]>;
    format: z.ZodEnum<["csv", "pdf"]>;
    startDate: z.ZodString;
    endDate: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "productivity" | "finance";
    startDate: string;
    endDate: string;
    format: "csv" | "pdf";
}, {
    type: "productivity" | "finance";
    startDate: string;
    endDate: string;
    format: "csv" | "pdf";
}>, {
    type: "productivity" | "finance";
    startDate: string;
    endDate: string;
    format: "csv" | "pdf";
}, {
    type: "productivity" | "finance";
    startDate: string;
    endDate: string;
    format: "csv" | "pdf";
}>, {
    type: "productivity" | "finance";
    startDate: string;
    endDate: string;
    format: "csv" | "pdf";
}, {
    type: "productivity" | "finance";
    startDate: string;
    endDate: string;
    format: "csv" | "pdf";
}>;
export type AnalyticsExportQuery = z.infer<typeof analyticsExportQuerySchema>;
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
    rangeCompletionRate: number;
    lastCheckInDate: string | null;
}
export interface ProductivityDailyTrendItem {
    date: string;
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
        completionRate: number;
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
    period: string;
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
        savingsRate: number;
        transactionCount: number;
    };
    categoryBreakdown: FinanceCategoryBreakdownItem[];
    trend: FinanceTrendItem[];
    budgetAdherence: {
        budgetsTracked: number;
        budgetsOnTrack: number;
        budgetsExceeded: number;
        adherenceRate: number;
        budgets: BudgetAdherenceItem[];
    };
}
