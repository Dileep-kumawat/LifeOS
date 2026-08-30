import { z } from "zod";
/**
 * Status lifecycle of a focus session.
 */
export declare const focusSessionStatusSchema: z.ZodEnum<["active", "paused", "completed", "abandoned"]>;
export type FocusSessionStatus = z.infer<typeof focusSessionStatusSchema>;
/**
 * Phase of a Pomodoro cycle.
 */
export declare const focusPhaseSchema: z.ZodEnum<["work", "break", "long_break"]>;
export type FocusPhase = z.infer<typeof focusPhaseSchema>;
/**
 * Supported polymorphic link types for Pomodoro focus sessions.
 */
export declare const focusLinkedTypeSchema: z.ZodEnum<["task", "goal", "topic", "none"]>;
export type FocusLinkedType = z.infer<typeof focusLinkedTypeSchema>;
/**
 * Input schema for starting a new focus session.
 */
export declare const createFocusSessionSchema: z.ZodObject<{
    /** Work duration in minutes (default: 25) */
    workMinutes: z.ZodDefault<z.ZodNumber>;
    /** Short break duration in minutes (default: 5) */
    breakMinutes: z.ZodDefault<z.ZodNumber>;
    /** Long break duration in minutes (default: 15) */
    longBreakMinutes: z.ZodDefault<z.ZodNumber>;
    /** Number of cycles before triggering a long break (default: 4) */
    longBreakInterval: z.ZodDefault<z.ZodNumber>;
    /** Polymorphic link type (task, goal, topic, none) */
    linkedType: z.ZodDefault<z.ZodEnum<["task", "goal", "topic", "none"]>>;
    /** Polymorphic ref ID (e.g. topicId or goalId) */
    linkedId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    /** Optional temporary DND toggle override for this session */
    dndDuringFocus: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    workMinutes: number;
    breakMinutes: number;
    longBreakMinutes: number;
    longBreakInterval: number;
    linkedType: "task" | "goal" | "topic" | "none";
    dndDuringFocus?: boolean | undefined;
    linkedId?: string | null | undefined;
}, {
    dndDuringFocus?: boolean | undefined;
    workMinutes?: number | undefined;
    breakMinutes?: number | undefined;
    longBreakMinutes?: number | undefined;
    longBreakInterval?: number | undefined;
    linkedType?: "task" | "goal" | "topic" | "none" | undefined;
    linkedId?: string | null | undefined;
}>;
export type CreateFocusSessionInput = z.input<typeof createFocusSessionSchema>;
/**
 * URL parameter schema for focus session operations.
 */
export declare const focusSessionParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export type FocusSessionParams = z.infer<typeof focusSessionParamsSchema>;
/**
 * Query schema for listing historical focus sessions.
 */
export declare const listFocusSessionsQuerySchema: z.ZodObject<{
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    linkedType: z.ZodOptional<z.ZodEnum<["task", "goal", "topic", "none"]>>;
    linkedId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["active", "paused", "completed", "abandoned"]>>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    status?: "active" | "completed" | "paused" | "abandoned" | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    linkedType?: "task" | "goal" | "topic" | "none" | undefined;
    linkedId?: string | undefined;
}, {
    status?: "active" | "completed" | "paused" | "abandoned" | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    linkedType?: "task" | "goal" | "topic" | "none" | undefined;
    linkedId?: string | undefined;
}>;
export type ListFocusSessionsQuery = z.input<typeof listFocusSessionsQuerySchema>;
/**
 * Schema for client-timed interval transition notification.
 */
export declare const intervalCompleteSchema: z.ZodObject<{
    /** Phase that just completed */
    completedPhase: z.ZodEnum<["work", "break", "long_break"]>;
    /** Optional explicit next phase override */
    nextPhase: z.ZodOptional<z.ZodEnum<["work", "break", "long_break"]>>;
    /** Optional current cycle counter */
    cycle: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    completedPhase: "work" | "break" | "long_break";
    nextPhase?: "work" | "break" | "long_break" | undefined;
    cycle?: number | undefined;
}, {
    completedPhase: "work" | "break" | "long_break";
    nextPhase?: "work" | "break" | "long_break" | undefined;
    cycle?: number | undefined;
}>;
export type IntervalCompleteInput = z.input<typeof intervalCompleteSchema>;
/**
 * Serialized API response schema for a focus session.
 */
export declare const focusSessionSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    workMinutes: z.ZodNumber;
    breakMinutes: z.ZodNumber;
    longBreakMinutes: z.ZodNumber;
    longBreakInterval: z.ZodNumber;
    currentCycle: z.ZodNumber;
    currentPhase: z.ZodEnum<["work", "break", "long_break"]>;
    linkedType: z.ZodEnum<["task", "goal", "topic", "none"]>;
    linkedId: z.ZodNullable<z.ZodString>;
    status: z.ZodEnum<["active", "paused", "completed", "abandoned"]>;
    startedAt: z.ZodString;
    completedAt: z.ZodNullable<z.ZodString>;
    pausedAt: z.ZodNullable<z.ZodString>;
    lastResumedAt: z.ZodNullable<z.ZodString>;
    totalFocusMinutes: z.ZodNumber;
    accumulatedWorkSeconds: z.ZodNumber;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "active" | "completed" | "paused" | "abandoned";
    id: string;
    createdAt: string;
    userId: string;
    updatedAt: string;
    completedAt: string | null;
    totalFocusMinutes: number;
    workMinutes: number;
    breakMinutes: number;
    longBreakMinutes: number;
    longBreakInterval: number;
    linkedType: "task" | "goal" | "topic" | "none";
    linkedId: string | null;
    currentCycle: number;
    currentPhase: "work" | "break" | "long_break";
    startedAt: string;
    pausedAt: string | null;
    lastResumedAt: string | null;
    accumulatedWorkSeconds: number;
}, {
    status: "active" | "completed" | "paused" | "abandoned";
    id: string;
    createdAt: string;
    userId: string;
    updatedAt: string;
    completedAt: string | null;
    totalFocusMinutes: number;
    workMinutes: number;
    breakMinutes: number;
    longBreakMinutes: number;
    longBreakInterval: number;
    linkedType: "task" | "goal" | "topic" | "none";
    linkedId: string | null;
    currentCycle: number;
    currentPhase: "work" | "break" | "long_break";
    startedAt: string;
    pausedAt: string | null;
    lastResumedAt: string | null;
    accumulatedWorkSeconds: number;
}>;
export type FocusSession = z.infer<typeof focusSessionSchema>;
/**
 * Query schema for focus time aggregation summary (FR-7.4, FR-8.3).
 * Reuses Finance Phase 4's summary & trend query param convention.
 */
export declare const focusSummaryQuerySchema: z.ZodObject<{
    /** Presets: "day", "week", "month" */
    range: z.ZodOptional<z.ZodEnum<["day", "week", "month"]>>;
    /** Specific month in YYYY-MM format */
    month: z.ZodOptional<z.ZodString>;
    /** Number of months for multi-month trend analysis (default: 6) */
    months: z.ZodOptional<z.ZodNumber>;
    /** Explicit ISO start date/time override */
    startDate: z.ZodOptional<z.ZodString>;
    /** Explicit ISO end date/time override */
    endDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    month?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    months?: number | undefined;
    range?: "day" | "week" | "month" | undefined;
}, {
    month?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    months?: number | undefined;
    range?: "day" | "week" | "month" | undefined;
}>;
export type FocusSummaryQuery = z.input<typeof focusSummaryQuerySchema>;
/**
 * Breakdown of focus time categorized by linked entity type.
 */
export declare const focusLinkedTypeBreakdownItemSchema: z.ZodObject<{
    linkedType: z.ZodEnum<["task", "goal", "topic", "none"]>;
    totalMinutes: z.ZodNumber;
    count: z.ZodNumber;
    percentage: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    count: number;
    linkedType: "task" | "goal" | "topic" | "none";
    totalMinutes: number;
    percentage: number;
}, {
    count: number;
    linkedType: "task" | "goal" | "topic" | "none";
    totalMinutes: number;
    percentage: number;
}>;
export type FocusLinkedTypeBreakdownItem = z.infer<typeof focusLinkedTypeBreakdownItemSchema>;
/**
 * Time series trend item for focus duration charts.
 */
export declare const focusTrendItemSchema: z.ZodObject<{
    date: z.ZodString;
    totalMinutes: z.ZodNumber;
    count: z.ZodNumber;
    completedCount: z.ZodNumber;
    abandonedCount: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    date: string;
    count: number;
    completedCount: number;
    abandonedCount: number;
    totalMinutes: number;
}, {
    date: string;
    count: number;
    completedCount: number;
    abandonedCount: number;
    totalMinutes: number;
}>;
export type FocusTrendItem = z.infer<typeof focusTrendItemSchema>;
/**
 * Aggregated summary response designed for Focus dashboard and downstream Phase 9 analytics.
 */
export declare const focusSummaryResponseSchema: z.ZodObject<{
    period: z.ZodObject<{
        range: z.ZodOptional<z.ZodEnum<["day", "week", "month"]>>;
        startDate: z.ZodString;
        endDate: z.ZodString;
        label: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        startDate: string;
        endDate: string;
        label: string;
        range?: "day" | "week" | "month" | undefined;
    }, {
        startDate: string;
        endDate: string;
        label: string;
        range?: "day" | "week" | "month" | undefined;
    }>;
    totalFocusMinutes: z.ZodNumber;
    totalSessionsCount: z.ZodNumber;
    completedSessionsCount: z.ZodNumber;
    abandonedSessionsCount: z.ZodNumber;
    activeSessionsCount: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    averageSessionMinutes: z.ZodNumber;
    linkedTypeBreakdown: z.ZodArray<z.ZodObject<{
        linkedType: z.ZodEnum<["task", "goal", "topic", "none"]>;
        totalMinutes: z.ZodNumber;
        count: z.ZodNumber;
        percentage: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        count: number;
        linkedType: "task" | "goal" | "topic" | "none";
        totalMinutes: number;
        percentage: number;
    }, {
        count: number;
        linkedType: "task" | "goal" | "topic" | "none";
        totalMinutes: number;
        percentage: number;
    }>, "many">;
    trend: z.ZodArray<z.ZodObject<{
        date: z.ZodString;
        totalMinutes: z.ZodNumber;
        count: z.ZodNumber;
        completedCount: z.ZodNumber;
        abandonedCount: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        date: string;
        count: number;
        completedCount: number;
        abandonedCount: number;
        totalMinutes: number;
    }, {
        date: string;
        count: number;
        completedCount: number;
        abandonedCount: number;
        totalMinutes: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    period: {
        startDate: string;
        endDate: string;
        label: string;
        range?: "day" | "week" | "month" | undefined;
    };
    totalFocusMinutes: number;
    totalSessionsCount: number;
    completedSessionsCount: number;
    abandonedSessionsCount: number;
    activeSessionsCount: number;
    averageSessionMinutes: number;
    linkedTypeBreakdown: {
        count: number;
        linkedType: "task" | "goal" | "topic" | "none";
        totalMinutes: number;
        percentage: number;
    }[];
    trend: {
        date: string;
        count: number;
        completedCount: number;
        abandonedCount: number;
        totalMinutes: number;
    }[];
}, {
    period: {
        startDate: string;
        endDate: string;
        label: string;
        range?: "day" | "week" | "month" | undefined;
    };
    totalFocusMinutes: number;
    totalSessionsCount: number;
    completedSessionsCount: number;
    abandonedSessionsCount: number;
    averageSessionMinutes: number;
    linkedTypeBreakdown: {
        count: number;
        linkedType: "task" | "goal" | "topic" | "none";
        totalMinutes: number;
        percentage: number;
    }[];
    trend: {
        date: string;
        count: number;
        completedCount: number;
        abandonedCount: number;
        totalMinutes: number;
    }[];
    activeSessionsCount?: number | undefined;
}>;
export type FocusSummaryResponse = z.infer<typeof focusSummaryResponseSchema>;
