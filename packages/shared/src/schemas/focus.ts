import { z } from "zod";

/**
 * Status lifecycle of a focus session.
 */
export const focusSessionStatusSchema = z.enum([
  "active",
  "paused",
  "completed",
  "abandoned"
]);
export type FocusSessionStatus = z.infer<typeof focusSessionStatusSchema>;

/**
 * Phase of a Pomodoro cycle.
 */
export const focusPhaseSchema = z.enum(["work", "break", "long_break"]);
export type FocusPhase = z.infer<typeof focusPhaseSchema>;

/**
 * Supported polymorphic link types for Pomodoro focus sessions.
 */
export const focusLinkedTypeSchema = z.enum(["task", "goal", "topic", "none"]);
export type FocusLinkedType = z.infer<typeof focusLinkedTypeSchema>;

/**
 * Input schema for starting a new focus session.
 */
export const createFocusSessionSchema = z.object({
  /** Work duration in minutes (default: 25) */
  workMinutes: z.coerce.number().int().min(1).max(180).default(25),
  /** Short break duration in minutes (default: 5) */
  breakMinutes: z.coerce.number().int().min(1).max(60).default(5),
  /** Long break duration in minutes (default: 15) */
  longBreakMinutes: z.coerce.number().int().min(1).max(120).default(15),
  /** Number of cycles before triggering a long break (default: 4) */
  longBreakInterval: z.coerce.number().int().min(1).max(12).default(4),
  /** Polymorphic link type (task, goal, topic, none) */
  linkedType: focusLinkedTypeSchema.default("none"),
  /** Polymorphic ref ID (e.g. topicId or goalId) */
  linkedId: z.string().nullable().optional(),
  /** Optional temporary DND toggle override for this session */
  dndDuringFocus: z.boolean().optional()
});
export type CreateFocusSessionInput = z.input<typeof createFocusSessionSchema>;

/**
 * URL parameter schema for focus session operations.
 */
export const focusSessionParamsSchema = z.object({
  id: z.string().min(1, "Session ID is required")
});
export type FocusSessionParams = z.infer<typeof focusSessionParamsSchema>;

/**
 * Query schema for listing historical focus sessions.
 */
export const listFocusSessionsQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  linkedType: focusLinkedTypeSchema.optional(),
  linkedId: z.string().optional(),
  status: focusSessionStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});
export type ListFocusSessionsQuery = z.input<typeof listFocusSessionsQuerySchema>;

/**
 * Schema for client-timed interval transition notification.
 */
export const intervalCompleteSchema = z.object({
  /** Phase that just completed */
  completedPhase: focusPhaseSchema,
  /** Optional explicit next phase override */
  nextPhase: focusPhaseSchema.optional(),
  /** Optional current cycle counter */
  cycle: z.coerce.number().int().min(1).optional()
});
export type IntervalCompleteInput = z.input<typeof intervalCompleteSchema>;

/**
 * Serialized API response schema for a focus session.
 */
export const focusSessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  workMinutes: z.number(),
  breakMinutes: z.number(),
  longBreakMinutes: z.number(),
  longBreakInterval: z.number(),
  currentCycle: z.number(),
  currentPhase: focusPhaseSchema,
  linkedType: focusLinkedTypeSchema,
  linkedId: z.string().nullable(),
  status: focusSessionStatusSchema,
  startedAt: z.string(),
  completedAt: z.string().nullable(),
  pausedAt: z.string().nullable(),
  lastResumedAt: z.string().nullable(),
  totalFocusMinutes: z.number(),
  accumulatedWorkSeconds: z.number(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export type FocusSession = z.infer<typeof focusSessionSchema>;

/**
 * Query schema for focus time aggregation summary (FR-7.4, FR-8.3).
 * Reuses Finance Phase 4's summary & trend query param convention.
 */
export const focusSummaryQuerySchema = z.object({
  /** Presets: "day", "week", "month" */
  range: z.enum(["day", "week", "month"]).optional(),
  /** Specific month in YYYY-MM format */
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Invalid month format (YYYY-MM)")
    .optional(),
  /** Number of months for multi-month trend analysis (default: 6) */
  months: z.coerce.number().int().min(1).max(24).optional(),
  /** Explicit ISO start date/time override */
  startDate: z.string().optional(),
  /** Explicit ISO end date/time override */
  endDate: z.string().optional()
});
export type FocusSummaryQuery = z.input<typeof focusSummaryQuerySchema>;


/**
 * Breakdown of focus time categorized by linked entity type.
 */
export const focusLinkedTypeBreakdownItemSchema = z.object({
  linkedType: focusLinkedTypeSchema,
  totalMinutes: z.number(),
  count: z.number(),
  percentage: z.number()
});
export type FocusLinkedTypeBreakdownItem = z.infer<typeof focusLinkedTypeBreakdownItemSchema>;

/**
 * Time series trend item for focus duration charts.
 */
export const focusTrendItemSchema = z.object({
  date: z.string(),
  totalMinutes: z.number(),
  count: z.number(),
  completedCount: z.number(),
  abandonedCount: z.number()
});
export type FocusTrendItem = z.infer<typeof focusTrendItemSchema>;

/**
 * Aggregated summary response designed for Focus dashboard and downstream Phase 9 analytics.
 */
export const focusSummaryResponseSchema = z.object({
  period: z.object({
    range: z.enum(["day", "week", "month"]).optional(),
    startDate: z.string(),
    endDate: z.string(),
    label: z.string()
  }),
  totalFocusMinutes: z.number(),
  totalSessionsCount: z.number(),
  completedSessionsCount: z.number(),
  abandonedSessionsCount: z.number(),
  activeSessionsCount: z.number().optional().default(0),
  averageSessionMinutes: z.number(),
  linkedTypeBreakdown: z.array(focusLinkedTypeBreakdownItemSchema),
  trend: z.array(focusTrendItemSchema)
});
export type FocusSummaryResponse = z.infer<typeof focusSummaryResponseSchema>;

