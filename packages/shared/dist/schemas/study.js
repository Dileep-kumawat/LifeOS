import { z } from "zod";
const objectIdString = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid ObjectId");
// ─── Priority & Status Enums ────────────────────────────────────────────────
export const topicPriorityEnum = z.enum(["low", "medium", "high"]);
export const topicStatusEnum = z.enum(["not_started", "in_progress", "completed"]);
// ─── Subject Schemas ────────────────────────────────────────────────────────
export const createSubjectSchema = z.object({
    name: z.string().trim().min(1, "Subject name is required").max(100, "Subject name too long"),
    color: z
        .string()
        .trim()
        .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Must be a valid hex color (e.g. #0075de)")
        .default("#0075de"),
    examDate: z.coerce.date().nullable().optional().default(null)
});
export const updateSubjectSchema = z.object({
    name: z.string().trim().min(1, "Subject name is required").max(100).optional(),
    color: z
        .string()
        .trim()
        .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Must be a valid hex color")
        .optional(),
    examDate: z.coerce.date().nullable().optional()
});
export const subjectParamsSchema = z.object({
    id: objectIdString
});
export const listSubjectsQuerySchema = z.object({
    search: z.string().trim().optional()
});
// ─── Topic Schemas ──────────────────────────────────────────────────────────
export const createTopicSchema = z.object({
    subjectId: objectIdString,
    title: z.string().trim().min(1, "Topic title is required").max(200, "Topic title too long"),
    deadline: z.coerce.date().nullable().optional().default(null),
    priority: topicPriorityEnum.default("medium"),
    status: topicStatusEnum.default("not_started"),
    estimatedMinutes: z.coerce
        .number()
        .int("Estimated minutes must be an integer")
        .positive("Estimated minutes must be positive")
        .nullable()
        .optional()
        .default(null)
});
export const updateTopicSchema = z.object({
    subjectId: objectIdString.optional(),
    title: z.string().trim().min(1, "Topic title cannot be empty").max(200).optional(),
    deadline: z.coerce.date().nullable().optional(),
    priority: topicPriorityEnum.optional(),
    status: topicStatusEnum.optional(),
    estimatedMinutes: z.coerce
        .number()
        .int("Estimated minutes must be an integer")
        .positive("Estimated minutes must be positive")
        .nullable()
        .optional()
});
export const topicParamsSchema = z.object({
    id: objectIdString
});
export const listTopicsQuerySchema = z.object({
    subjectId: objectIdString.optional(),
    status: topicStatusEnum.optional(),
    priority: topicPriorityEnum.optional(),
    dueSoon: z
        .enum(["true", "false"])
        .optional()
        .transform((val) => (val === "true" ? true : val === "false" ? false : undefined)),
    sort: z.enum(["deadline", "priority", "status", "createdAt"]).optional()
});
// ─── Flashcard Schemas ──────────────────────────────────────────────────────
export const createFlashcardSchema = z.object({
    topicId: objectIdString.nullable().optional().default(null),
    subjectId: objectIdString.nullable().optional().default(null),
    front: z.string().trim().min(1, "Front text is required").max(2000, "Front text too long"),
    back: z.string().trim().min(1, "Back text is required").max(5000, "Back text too long")
});
export const updateFlashcardSchema = z.object({
    topicId: objectIdString.nullable().optional(),
    subjectId: objectIdString.nullable().optional(),
    front: z.string().trim().min(1, "Front text cannot be empty").max(2000).optional(),
    back: z.string().trim().min(1, "Back text cannot be empty").max(5000).optional()
});
export const flashcardParamsSchema = z.object({
    id: objectIdString
});
export const listFlashcardsQuerySchema = z.object({
    topicId: objectIdString.optional(),
    subjectId: objectIdString.optional()
});
export const reviewFlashcardSchema = z.object({
    quality: z.coerce
        .number()
        .int("Quality must be an integer between 0 and 5")
        .min(0, "Minimum quality is 0 (complete blackout)")
        .max(5, "Maximum quality is 5 (perfect response)")
});
// ─── Topic Focus & Detail Linkage Schemas (FR-7.4) ──────────────────────────
/**
 * Topic focus time aggregated metrics.
 */
export const topicFocusTimeSchema = z.object({
    topicId: z.string(),
    totalFocusMinutes: z.number(),
    sessionCount: z.number(),
    completedCount: z.number(),
    abandonedCount: z.number()
});
/**
 * Topic Plan Event item from calendar linkage (Prompt 2).
 */
export const topicPlanEventSchema = z.object({
    id: z.string(),
    title: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    status: z.string().optional()
});
/**
 * Flashcard stats breakdown for a topic.
 */
export const topicFlashcardStatsSchema = z.object({
    total: z.number(),
    due: z.number(),
    mastered: z.number(),
    learning: z.number()
});
