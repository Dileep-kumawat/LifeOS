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
    totalFocusMinutes: number;
    accumulatedWorkSeconds: number;
}, {
    status: "active" | "completed" | "paused" | "abandoned";
    id: string;
    createdAt: string;
    userId: string;
    updatedAt: string;
    completedAt: string | null;
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
    totalFocusMinutes: number;
    accumulatedWorkSeconds: number;
}>;
export type FocusSession = z.infer<typeof focusSessionSchema>;
