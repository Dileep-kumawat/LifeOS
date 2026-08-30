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
