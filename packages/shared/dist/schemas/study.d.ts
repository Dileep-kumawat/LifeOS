import { z } from "zod";
export declare const topicPriorityEnum: z.ZodEnum<["low", "medium", "high"]>;
export type TopicPriority = z.infer<typeof topicPriorityEnum>;
export declare const topicStatusEnum: z.ZodEnum<["not_started", "in_progress", "completed"]>;
export type TopicStatus = z.infer<typeof topicStatusEnum>;
export declare const createSubjectSchema: z.ZodObject<{
    name: z.ZodString;
    color: z.ZodDefault<z.ZodString>;
    examDate: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodDate>>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    color: string;
    examDate: Date | null;
}, {
    name: string;
    color?: string | undefined;
    examDate?: Date | null | undefined;
}>;
export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;
export declare const updateSubjectSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    color: z.ZodOptional<z.ZodString>;
    examDate: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    color?: string | undefined;
    examDate?: Date | null | undefined;
}, {
    name?: string | undefined;
    color?: string | undefined;
    examDate?: Date | null | undefined;
}>;
export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;
export declare const subjectParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export type SubjectParams = z.infer<typeof subjectParamsSchema>;
export declare const listSubjectsQuerySchema: z.ZodObject<{
    search: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    search?: string | undefined;
}, {
    search?: string | undefined;
}>;
export type ListSubjectsQuery = z.infer<typeof listSubjectsQuerySchema>;
export declare const createTopicSchema: z.ZodObject<{
    subjectId: z.ZodString;
    title: z.ZodString;
    deadline: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodDate>>>;
    priority: z.ZodDefault<z.ZodEnum<["low", "medium", "high"]>>;
    status: z.ZodDefault<z.ZodEnum<["not_started", "in_progress", "completed"]>>;
    estimatedMinutes: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
}, "strip", z.ZodTypeAny, {
    status: "completed" | "not_started" | "in_progress";
    title: string;
    subjectId: string;
    deadline: Date | null;
    priority: "low" | "medium" | "high";
    estimatedMinutes: number | null;
}, {
    title: string;
    subjectId: string;
    status?: "completed" | "not_started" | "in_progress" | undefined;
    deadline?: Date | null | undefined;
    priority?: "low" | "medium" | "high" | undefined;
    estimatedMinutes?: number | null | undefined;
}>;
export type CreateTopicInput = z.infer<typeof createTopicSchema>;
export declare const updateTopicSchema: z.ZodObject<{
    subjectId: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    deadline: z.ZodOptional<z.ZodNullable<z.ZodDate>>;
    priority: z.ZodOptional<z.ZodEnum<["low", "medium", "high"]>>;
    status: z.ZodOptional<z.ZodEnum<["not_started", "in_progress", "completed"]>>;
    estimatedMinutes: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    status?: "completed" | "not_started" | "in_progress" | undefined;
    title?: string | undefined;
    subjectId?: string | undefined;
    deadline?: Date | null | undefined;
    priority?: "low" | "medium" | "high" | undefined;
    estimatedMinutes?: number | null | undefined;
}, {
    status?: "completed" | "not_started" | "in_progress" | undefined;
    title?: string | undefined;
    subjectId?: string | undefined;
    deadline?: Date | null | undefined;
    priority?: "low" | "medium" | "high" | undefined;
    estimatedMinutes?: number | null | undefined;
}>;
export type UpdateTopicInput = z.infer<typeof updateTopicSchema>;
export declare const topicParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export type TopicParams = z.infer<typeof topicParamsSchema>;
export declare const listTopicsQuerySchema: z.ZodObject<{
    subjectId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["not_started", "in_progress", "completed"]>>;
    priority: z.ZodOptional<z.ZodEnum<["low", "medium", "high"]>>;
    dueSoon: z.ZodEffects<z.ZodOptional<z.ZodEnum<["true", "false"]>>, boolean | undefined, "true" | "false" | undefined>;
    sort: z.ZodOptional<z.ZodEnum<["deadline", "priority", "status", "createdAt"]>>;
}, "strip", z.ZodTypeAny, {
    sort?: "status" | "createdAt" | "deadline" | "priority" | undefined;
    status?: "completed" | "not_started" | "in_progress" | undefined;
    subjectId?: string | undefined;
    priority?: "low" | "medium" | "high" | undefined;
    dueSoon?: boolean | undefined;
}, {
    sort?: "status" | "createdAt" | "deadline" | "priority" | undefined;
    status?: "completed" | "not_started" | "in_progress" | undefined;
    subjectId?: string | undefined;
    priority?: "low" | "medium" | "high" | undefined;
    dueSoon?: "true" | "false" | undefined;
}>;
export type ListTopicsQuery = z.infer<typeof listTopicsQuerySchema>;
export declare const createFlashcardSchema: z.ZodObject<{
    topicId: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    subjectId: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    front: z.ZodString;
    back: z.ZodString;
}, "strip", z.ZodTypeAny, {
    subjectId: string | null;
    topicId: string | null;
    front: string;
    back: string;
}, {
    front: string;
    back: string;
    subjectId?: string | null | undefined;
    topicId?: string | null | undefined;
}>;
export type CreateFlashcardInput = z.infer<typeof createFlashcardSchema>;
export declare const updateFlashcardSchema: z.ZodObject<{
    topicId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    subjectId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    front: z.ZodOptional<z.ZodString>;
    back: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    subjectId?: string | null | undefined;
    topicId?: string | null | undefined;
    front?: string | undefined;
    back?: string | undefined;
}, {
    subjectId?: string | null | undefined;
    topicId?: string | null | undefined;
    front?: string | undefined;
    back?: string | undefined;
}>;
export type UpdateFlashcardInput = z.infer<typeof updateFlashcardSchema>;
export declare const flashcardParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export type FlashcardParams = z.infer<typeof flashcardParamsSchema>;
export declare const listFlashcardsQuerySchema: z.ZodObject<{
    topicId: z.ZodOptional<z.ZodString>;
    subjectId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    subjectId?: string | undefined;
    topicId?: string | undefined;
}, {
    subjectId?: string | undefined;
    topicId?: string | undefined;
}>;
export type ListFlashcardsQuery = z.infer<typeof listFlashcardsQuerySchema>;
export declare const reviewFlashcardSchema: z.ZodObject<{
    quality: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    quality: number;
}, {
    quality: number;
}>;
export type ReviewFlashcardInput = z.infer<typeof reviewFlashcardSchema>;
/**
 * Topic focus time aggregated metrics.
 */
export declare const topicFocusTimeSchema: z.ZodObject<{
    topicId: z.ZodString;
    totalFocusMinutes: z.ZodNumber;
    sessionCount: z.ZodNumber;
    completedCount: z.ZodNumber;
    abandonedCount: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    topicId: string;
    totalFocusMinutes: number;
    sessionCount: number;
    completedCount: number;
    abandonedCount: number;
}, {
    topicId: string;
    totalFocusMinutes: number;
    sessionCount: number;
    completedCount: number;
    abandonedCount: number;
}>;
export type TopicFocusTime = z.infer<typeof topicFocusTimeSchema>;
/**
 * Topic Plan Event item from calendar linkage (Prompt 2).
 */
export declare const topicPlanEventSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    startTime: z.ZodString;
    endTime: z.ZodString;
    status: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    status?: string | undefined;
}, {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    status?: string | undefined;
}>;
export type TopicPlanEvent = z.infer<typeof topicPlanEventSchema>;
/**
 * Flashcard stats breakdown for a topic.
 */
export declare const topicFlashcardStatsSchema: z.ZodObject<{
    total: z.ZodNumber;
    due: z.ZodNumber;
    mastered: z.ZodNumber;
    learning: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    total: number;
    due: number;
    mastered: number;
    learning: number;
}, {
    total: number;
    due: number;
    mastered: number;
    learning: number;
}>;
export type TopicFlashcardStats = z.infer<typeof topicFlashcardStatsSchema>;
