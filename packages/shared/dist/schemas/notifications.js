import { z } from "zod";
/**
 * Known notification `type` values. The Notification model does NOT enforce
 * this set in schema validation — the enum here exists for documentation,
 * typed helper functions, and Swagger. New types (e.g. `daily_summary`,
 * `budget_alert`) are added by extending this list and registering a handler
 * in the jobs worker; nothing in the queue wrapper or model changes.
 */
export const KNOWN_NOTIFICATION_TYPES = [
    "calendar_reminder",
    "habit_reminder",
    "system",
    "budget_alert",
    "daily_summary"
];
export const knownNotificationTypeSchema = z.enum(KNOWN_NOTIFICATION_TYPES);
/** Delivery channel for a single Notification document. */
export const notificationChannelSchema = z.enum(["push", "in_app", "email"]);
/**
 * Delivery lifecycle — orthogonal to read state. `pending` means a job is
 * scheduled/queued; `sent` means the channel delivered it; `failed` means it
 * exhausted retries (dead-lettered, logged with context).
 */
export const deliveryStatusSchema = z.enum(["pending", "sent", "failed"]);
/** Read state — only meaningful for the in_app channel. */
export const readStatusSchema = z.enum(["read", "unread"]);
/**
 * A single collapsible item inside a batched notification (FR-13.4). Multiple
 * habit reminders due in the same window collapse into ONE Notification whose
 * payload carries a list of these items and is delivered as a single push.
 */
export const notificationItemSchema = z.object({
    title: z.string(),
    body: z.string().optional(),
    data: z.record(z.unknown()).optional()
});
/**
 * Flexible payload carried by a Notification. `title`/`body` are the
 * human-readable summary; `data` carries deep-linking info (source
 * eventId/habitId/etc); `items` is populated when reminders were batched.
 */
export const notificationPayloadSchema = z.object({
    title: z.string().default(""),
    body: z.string().default(""),
    data: z.record(z.unknown()).optional(),
    items: z.array(notificationItemSchema).optional()
});
/** API response shape for a single Notification document. */
export const notificationSchema = z.object({
    id: z.string(),
    userId: z.string(),
    type: z.string(),
    channel: notificationChannelSchema,
    payload: notificationPayloadSchema,
    deliveryStatus: deliveryStatusSchema,
    readStatus: readStatusSchema,
    scheduledFor: z.string(),
    sentAt: z.string().nullable(),
    readAt: z.string().nullable(),
    createdAt: z.string()
});
/**
 * Per-module preference toggles. Every known module defaults to enabled for
 * both push and in-app; users opt out rather than in. The model stores only
 * the modules below, but the delivery code treats a missing module or missing
 * toggle as "enabled" so old documents without preferences still receive
 * notifications.
 */
export const modulePreferenceSchema = z.object({
    push: z.boolean().default(true),
    inApp: z.boolean().default(true)
});
export const dailySummaryPreferenceSchema = z.object({
    deliveryTime: z
        .string()
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "deliveryTime must be HH:mm format")
        .default("07:00"),
    channels: z.array(z.enum(["push", "in_app", "email"])).default(["push", "in_app"]),
    timezone: z.string().optional()
});
export const notificationPreferencesSchema = z.object({
    calendarReminders: modulePreferenceSchema.default({ push: true, inApp: true }),
    habitReminders: modulePreferenceSchema.default({ push: true, inApp: true }),
    system: modulePreferenceSchema.default({ push: true, inApp: true }),
    financeBudgetAlerts: modulePreferenceSchema.default({ push: true, inApp: true }),
    dailySummary: dailySummaryPreferenceSchema.default({
        deliveryTime: "07:00",
        channels: ["push", "in_app"]
    })
});
/** PATCH body — every module and every toggle is optional. */
export const updateNotificationPreferencesSchema = z.object({
    calendarReminders: modulePreferenceSchema.partial().optional(),
    habitReminders: modulePreferenceSchema.partial().optional(),
    system: modulePreferenceSchema.partial().optional(),
    financeBudgetAlerts: modulePreferenceSchema.partial().optional(),
    dailySummary: dailySummaryPreferenceSchema.partial().optional()
});
export const summaryCompletedItemSchema = z.object({
    id: z.string().optional(),
    title: z.string(),
    type: z.string().default("habit"),
    completedAt: z.string().optional()
});
export const summaryScheduleItemSchema = z.object({
    occurrenceId: z.string().optional(),
    title: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    location: z.string().optional(),
    isAllDay: z.boolean().optional()
});
export const summaryTopPrioritySchema = z.object({
    title: z.string(),
    category: z.string().optional(),
    rationale: z.string().optional()
});
export const dailySummarySchema = z.object({
    id: z.string(),
    userId: z.string(),
    date: z.string(),
    yesterdayCompleted: z.array(summaryCompletedItemSchema),
    todaySchedule: z.array(summaryScheduleItemSchema),
    topPriorities: z.array(summaryTopPrioritySchema),
    generatedAt: z.string()
});
/** POST /notifications/push-subscription body (from the browser Push API). */
export const createPushSubscriptionSchema = z.object({
    endpoint: z.string().url("endpoint must be a valid URL"),
    keys: z.object({
        p256dh: z.string().min(1, "keys.p256dh is required"),
        auth: z.string().min(1, "keys.auth is required")
    }),
    userAgent: z.string().max(500).optional()
});
/** DELETE /notifications/push-subscription body — address the subscription by endpoint. */
export const deletePushSubscriptionSchema = z.object({
    endpoint: z.string().url("endpoint must be a valid URL")
});
/** GET /notifications query — pagination + readStatus filter. */
export const listNotificationsQuerySchema = z.object({
    readStatus: readStatusSchema.optional(),
    channel: notificationChannelSchema.optional(),
    type: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20)
});
/** PATCH /notifications/:id/read path param. */
export const notificationIdParamsSchema = z.object({
    id: z.string().min(1, "notification id is required")
});
/** PATCH /notifications/mark-all-read body — optional readStatus scope. */
export const markAllReadSchema = z.object({
    readStatus: readStatusSchema.optional()
});
