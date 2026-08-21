import { z } from "zod";
/**
 * Known notification `type` values. The Notification model does NOT enforce
 * this set in schema validation — the enum here exists for documentation,
 * typed helper functions, and Swagger. New types (e.g. `daily_summary`,
 * `budget_alert`) are added by extending this list and registering a handler
 * in the jobs worker; nothing in the queue wrapper or model changes.
 */
export declare const KNOWN_NOTIFICATION_TYPES: readonly ["calendar_reminder", "habit_reminder", "system", "budget_alert", "daily_summary"];
export declare const knownNotificationTypeSchema: z.ZodEnum<["calendar_reminder", "habit_reminder", "system", "budget_alert", "daily_summary"]>;
export type KnownNotificationType = z.infer<typeof knownNotificationTypeSchema>;
/** Delivery channel for a single Notification document. */
export declare const notificationChannelSchema: z.ZodEnum<["push", "in_app", "email"]>;
export type NotificationChannel = z.infer<typeof notificationChannelSchema>;
/**
 * Delivery lifecycle — orthogonal to read state. `pending` means a job is
 * scheduled/queued; `sent` means the channel delivered it; `failed` means it
 * exhausted retries (dead-lettered, logged with context).
 */
export declare const deliveryStatusSchema: z.ZodEnum<["pending", "sent", "failed"]>;
export type DeliveryStatus = z.infer<typeof deliveryStatusSchema>;
/** Read state — only meaningful for the in_app channel. */
export declare const readStatusSchema: z.ZodEnum<["read", "unread"]>;
export type ReadStatus = z.infer<typeof readStatusSchema>;
/**
 * A single collapsible item inside a batched notification (FR-13.4). Multiple
 * habit reminders due in the same window collapse into ONE Notification whose
 * payload carries a list of these items and is delivered as a single push.
 */
export declare const notificationItemSchema: z.ZodObject<{
    title: z.ZodString;
    body: z.ZodOptional<z.ZodString>;
    data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    title: string;
    body?: string | undefined;
    data?: Record<string, unknown> | undefined;
}, {
    title: string;
    body?: string | undefined;
    data?: Record<string, unknown> | undefined;
}>;
export type NotificationItem = z.infer<typeof notificationItemSchema>;
/**
 * Flexible payload carried by a Notification. `title`/`body` are the
 * human-readable summary; `data` carries deep-linking info (source
 * eventId/habitId/etc); `items` is populated when reminders were batched.
 */
export declare const notificationPayloadSchema: z.ZodObject<{
    title: z.ZodDefault<z.ZodString>;
    body: z.ZodDefault<z.ZodString>;
    data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    items: z.ZodOptional<z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        body: z.ZodOptional<z.ZodString>;
        data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        body?: string | undefined;
        data?: Record<string, unknown> | undefined;
    }, {
        title: string;
        body?: string | undefined;
        data?: Record<string, unknown> | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    title: string;
    body: string;
    data?: Record<string, unknown> | undefined;
    items?: {
        title: string;
        body?: string | undefined;
        data?: Record<string, unknown> | undefined;
    }[] | undefined;
}, {
    title?: string | undefined;
    body?: string | undefined;
    data?: Record<string, unknown> | undefined;
    items?: {
        title: string;
        body?: string | undefined;
        data?: Record<string, unknown> | undefined;
    }[] | undefined;
}>;
export type NotificationPayload = z.infer<typeof notificationPayloadSchema>;
/** API response shape for a single Notification document. */
export declare const notificationSchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    type: z.ZodString;
    channel: z.ZodEnum<["push", "in_app", "email"]>;
    payload: z.ZodObject<{
        title: z.ZodDefault<z.ZodString>;
        body: z.ZodDefault<z.ZodString>;
        data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        items: z.ZodOptional<z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            body: z.ZodOptional<z.ZodString>;
            data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "strip", z.ZodTypeAny, {
            title: string;
            body?: string | undefined;
            data?: Record<string, unknown> | undefined;
        }, {
            title: string;
            body?: string | undefined;
            data?: Record<string, unknown> | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        body: string;
        data?: Record<string, unknown> | undefined;
        items?: {
            title: string;
            body?: string | undefined;
            data?: Record<string, unknown> | undefined;
        }[] | undefined;
    }, {
        title?: string | undefined;
        body?: string | undefined;
        data?: Record<string, unknown> | undefined;
        items?: {
            title: string;
            body?: string | undefined;
            data?: Record<string, unknown> | undefined;
        }[] | undefined;
    }>;
    deliveryStatus: z.ZodEnum<["pending", "sent", "failed"]>;
    readStatus: z.ZodEnum<["read", "unread"]>;
    scheduledFor: z.ZodString;
    sentAt: z.ZodNullable<z.ZodString>;
    readAt: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: string;
    id: string;
    createdAt: string;
    userId: string;
    channel: "email" | "push" | "in_app";
    payload: {
        title: string;
        body: string;
        data?: Record<string, unknown> | undefined;
        items?: {
            title: string;
            body?: string | undefined;
            data?: Record<string, unknown> | undefined;
        }[] | undefined;
    };
    deliveryStatus: "pending" | "sent" | "failed";
    readStatus: "read" | "unread";
    scheduledFor: string;
    sentAt: string | null;
    readAt: string | null;
}, {
    type: string;
    id: string;
    createdAt: string;
    userId: string;
    channel: "email" | "push" | "in_app";
    payload: {
        title?: string | undefined;
        body?: string | undefined;
        data?: Record<string, unknown> | undefined;
        items?: {
            title: string;
            body?: string | undefined;
            data?: Record<string, unknown> | undefined;
        }[] | undefined;
    };
    deliveryStatus: "pending" | "sent" | "failed";
    readStatus: "read" | "unread";
    scheduledFor: string;
    sentAt: string | null;
    readAt: string | null;
}>;
export type Notification = z.infer<typeof notificationSchema>;
/**
 * Per-module preference toggles. Every known module defaults to enabled for
 * both push and in-app; users opt out rather than in. The model stores only
 * the modules below, but the delivery code treats a missing module or missing
 * toggle as "enabled" so old documents without preferences still receive
 * notifications.
 */
export declare const modulePreferenceSchema: z.ZodObject<{
    push: z.ZodDefault<z.ZodBoolean>;
    inApp: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    push: boolean;
    inApp: boolean;
}, {
    push?: boolean | undefined;
    inApp?: boolean | undefined;
}>;
export type ModulePreference = z.infer<typeof modulePreferenceSchema>;
export declare const dailySummaryPreferenceSchema: z.ZodObject<{
    deliveryTime: z.ZodDefault<z.ZodString>;
    channels: z.ZodDefault<z.ZodArray<z.ZodEnum<["push", "in_app", "email"]>, "many">>;
    timezone: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    deliveryTime: string;
    channels: ("email" | "push" | "in_app")[];
    timezone?: string | undefined;
}, {
    timezone?: string | undefined;
    deliveryTime?: string | undefined;
    channels?: ("email" | "push" | "in_app")[] | undefined;
}>;
export type DailySummaryPreference = z.infer<typeof dailySummaryPreferenceSchema>;
export declare const notificationPreferencesSchema: z.ZodObject<{
    calendarReminders: z.ZodDefault<z.ZodObject<{
        push: z.ZodDefault<z.ZodBoolean>;
        inApp: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        push: boolean;
        inApp: boolean;
    }, {
        push?: boolean | undefined;
        inApp?: boolean | undefined;
    }>>;
    habitReminders: z.ZodDefault<z.ZodObject<{
        push: z.ZodDefault<z.ZodBoolean>;
        inApp: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        push: boolean;
        inApp: boolean;
    }, {
        push?: boolean | undefined;
        inApp?: boolean | undefined;
    }>>;
    system: z.ZodDefault<z.ZodObject<{
        push: z.ZodDefault<z.ZodBoolean>;
        inApp: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        push: boolean;
        inApp: boolean;
    }, {
        push?: boolean | undefined;
        inApp?: boolean | undefined;
    }>>;
    financeBudgetAlerts: z.ZodDefault<z.ZodObject<{
        push: z.ZodDefault<z.ZodBoolean>;
        inApp: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        push: boolean;
        inApp: boolean;
    }, {
        push?: boolean | undefined;
        inApp?: boolean | undefined;
    }>>;
    dailySummary: z.ZodDefault<z.ZodObject<{
        deliveryTime: z.ZodDefault<z.ZodString>;
        channels: z.ZodDefault<z.ZodArray<z.ZodEnum<["push", "in_app", "email"]>, "many">>;
        timezone: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        deliveryTime: string;
        channels: ("email" | "push" | "in_app")[];
        timezone?: string | undefined;
    }, {
        timezone?: string | undefined;
        deliveryTime?: string | undefined;
        channels?: ("email" | "push" | "in_app")[] | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    system: {
        push: boolean;
        inApp: boolean;
    };
    calendarReminders: {
        push: boolean;
        inApp: boolean;
    };
    habitReminders: {
        push: boolean;
        inApp: boolean;
    };
    financeBudgetAlerts: {
        push: boolean;
        inApp: boolean;
    };
    dailySummary: {
        deliveryTime: string;
        channels: ("email" | "push" | "in_app")[];
        timezone?: string | undefined;
    };
}, {
    system?: {
        push?: boolean | undefined;
        inApp?: boolean | undefined;
    } | undefined;
    calendarReminders?: {
        push?: boolean | undefined;
        inApp?: boolean | undefined;
    } | undefined;
    habitReminders?: {
        push?: boolean | undefined;
        inApp?: boolean | undefined;
    } | undefined;
    financeBudgetAlerts?: {
        push?: boolean | undefined;
        inApp?: boolean | undefined;
    } | undefined;
    dailySummary?: {
        timezone?: string | undefined;
        deliveryTime?: string | undefined;
        channels?: ("email" | "push" | "in_app")[] | undefined;
    } | undefined;
}>;
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;
/** PATCH body — every module and every toggle is optional. */
export declare const updateNotificationPreferencesSchema: z.ZodObject<{
    calendarReminders: z.ZodOptional<z.ZodObject<{
        push: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
        inApp: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        push?: boolean | undefined;
        inApp?: boolean | undefined;
    }, {
        push?: boolean | undefined;
        inApp?: boolean | undefined;
    }>>;
    habitReminders: z.ZodOptional<z.ZodObject<{
        push: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
        inApp: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        push?: boolean | undefined;
        inApp?: boolean | undefined;
    }, {
        push?: boolean | undefined;
        inApp?: boolean | undefined;
    }>>;
    system: z.ZodOptional<z.ZodObject<{
        push: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
        inApp: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        push?: boolean | undefined;
        inApp?: boolean | undefined;
    }, {
        push?: boolean | undefined;
        inApp?: boolean | undefined;
    }>>;
    financeBudgetAlerts: z.ZodOptional<z.ZodObject<{
        push: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
        inApp: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        push?: boolean | undefined;
        inApp?: boolean | undefined;
    }, {
        push?: boolean | undefined;
        inApp?: boolean | undefined;
    }>>;
    dailySummary: z.ZodOptional<z.ZodObject<{
        deliveryTime: z.ZodOptional<z.ZodDefault<z.ZodString>>;
        channels: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodEnum<["push", "in_app", "email"]>, "many">>>;
        timezone: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        timezone?: string | undefined;
        deliveryTime?: string | undefined;
        channels?: ("email" | "push" | "in_app")[] | undefined;
    }, {
        timezone?: string | undefined;
        deliveryTime?: string | undefined;
        channels?: ("email" | "push" | "in_app")[] | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    system?: {
        push?: boolean | undefined;
        inApp?: boolean | undefined;
    } | undefined;
    calendarReminders?: {
        push?: boolean | undefined;
        inApp?: boolean | undefined;
    } | undefined;
    habitReminders?: {
        push?: boolean | undefined;
        inApp?: boolean | undefined;
    } | undefined;
    financeBudgetAlerts?: {
        push?: boolean | undefined;
        inApp?: boolean | undefined;
    } | undefined;
    dailySummary?: {
        timezone?: string | undefined;
        deliveryTime?: string | undefined;
        channels?: ("email" | "push" | "in_app")[] | undefined;
    } | undefined;
}, {
    system?: {
        push?: boolean | undefined;
        inApp?: boolean | undefined;
    } | undefined;
    calendarReminders?: {
        push?: boolean | undefined;
        inApp?: boolean | undefined;
    } | undefined;
    habitReminders?: {
        push?: boolean | undefined;
        inApp?: boolean | undefined;
    } | undefined;
    financeBudgetAlerts?: {
        push?: boolean | undefined;
        inApp?: boolean | undefined;
    } | undefined;
    dailySummary?: {
        timezone?: string | undefined;
        deliveryTime?: string | undefined;
        channels?: ("email" | "push" | "in_app")[] | undefined;
    } | undefined;
}>;
export type UpdateNotificationPreferencesInput = z.infer<typeof updateNotificationPreferencesSchema>;
export declare const summaryCompletedItemSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    title: z.ZodString;
    type: z.ZodDefault<z.ZodString>;
    completedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: string;
    title: string;
    id?: string | undefined;
    completedAt?: string | undefined;
}, {
    title: string;
    type?: string | undefined;
    id?: string | undefined;
    completedAt?: string | undefined;
}>;
export declare const summaryScheduleItemSchema: z.ZodObject<{
    occurrenceId: z.ZodOptional<z.ZodString>;
    title: z.ZodString;
    startTime: z.ZodString;
    endTime: z.ZodString;
    location: z.ZodOptional<z.ZodString>;
    isAllDay: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    title: string;
    startTime: string;
    endTime: string;
    occurrenceId?: string | undefined;
    location?: string | undefined;
    isAllDay?: boolean | undefined;
}, {
    title: string;
    startTime: string;
    endTime: string;
    occurrenceId?: string | undefined;
    location?: string | undefined;
    isAllDay?: boolean | undefined;
}>;
export declare const summaryTopPrioritySchema: z.ZodObject<{
    title: z.ZodString;
    category: z.ZodOptional<z.ZodString>;
    rationale: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    title: string;
    category?: string | undefined;
    rationale?: string | undefined;
}, {
    title: string;
    category?: string | undefined;
    rationale?: string | undefined;
}>;
export declare const dailySummarySchema: z.ZodObject<{
    id: z.ZodString;
    userId: z.ZodString;
    date: z.ZodString;
    yesterdayCompleted: z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        title: z.ZodString;
        type: z.ZodDefault<z.ZodString>;
        completedAt: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: string;
        title: string;
        id?: string | undefined;
        completedAt?: string | undefined;
    }, {
        title: string;
        type?: string | undefined;
        id?: string | undefined;
        completedAt?: string | undefined;
    }>, "many">;
    todaySchedule: z.ZodArray<z.ZodObject<{
        occurrenceId: z.ZodOptional<z.ZodString>;
        title: z.ZodString;
        startTime: z.ZodString;
        endTime: z.ZodString;
        location: z.ZodOptional<z.ZodString>;
        isAllDay: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        startTime: string;
        endTime: string;
        occurrenceId?: string | undefined;
        location?: string | undefined;
        isAllDay?: boolean | undefined;
    }, {
        title: string;
        startTime: string;
        endTime: string;
        occurrenceId?: string | undefined;
        location?: string | undefined;
        isAllDay?: boolean | undefined;
    }>, "many">;
    topPriorities: z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        category: z.ZodOptional<z.ZodString>;
        rationale: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        category?: string | undefined;
        rationale?: string | undefined;
    }, {
        title: string;
        category?: string | undefined;
        rationale?: string | undefined;
    }>, "many">;
    generatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    date: string;
    userId: string;
    yesterdayCompleted: {
        type: string;
        title: string;
        id?: string | undefined;
        completedAt?: string | undefined;
    }[];
    todaySchedule: {
        title: string;
        startTime: string;
        endTime: string;
        occurrenceId?: string | undefined;
        location?: string | undefined;
        isAllDay?: boolean | undefined;
    }[];
    topPriorities: {
        title: string;
        category?: string | undefined;
        rationale?: string | undefined;
    }[];
    generatedAt: string;
}, {
    id: string;
    date: string;
    userId: string;
    yesterdayCompleted: {
        title: string;
        type?: string | undefined;
        id?: string | undefined;
        completedAt?: string | undefined;
    }[];
    todaySchedule: {
        title: string;
        startTime: string;
        endTime: string;
        occurrenceId?: string | undefined;
        location?: string | undefined;
        isAllDay?: boolean | undefined;
    }[];
    topPriorities: {
        title: string;
        category?: string | undefined;
        rationale?: string | undefined;
    }[];
    generatedAt: string;
}>;
export type DailySummary = z.infer<typeof dailySummarySchema>;
/** POST /notifications/push-subscription body (from the browser Push API). */
export declare const createPushSubscriptionSchema: z.ZodObject<{
    endpoint: z.ZodString;
    keys: z.ZodObject<{
        p256dh: z.ZodString;
        auth: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        p256dh: string;
        auth: string;
    }, {
        p256dh: string;
        auth: string;
    }>;
    userAgent: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    keys: {
        p256dh: string;
        auth: string;
    };
    endpoint: string;
    userAgent?: string | undefined;
}, {
    keys: {
        p256dh: string;
        auth: string;
    };
    endpoint: string;
    userAgent?: string | undefined;
}>;
export type CreatePushSubscriptionInput = z.infer<typeof createPushSubscriptionSchema>;
/** DELETE /notifications/push-subscription body — address the subscription by endpoint. */
export declare const deletePushSubscriptionSchema: z.ZodObject<{
    endpoint: z.ZodString;
}, "strip", z.ZodTypeAny, {
    endpoint: string;
}, {
    endpoint: string;
}>;
export type DeletePushSubscriptionInput = z.infer<typeof deletePushSubscriptionSchema>;
/** GET /notifications query — pagination + readStatus filter. */
export declare const listNotificationsQuerySchema: z.ZodObject<{
    readStatus: z.ZodOptional<z.ZodEnum<["read", "unread"]>>;
    channel: z.ZodOptional<z.ZodEnum<["push", "in_app", "email"]>>;
    type: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    type?: string | undefined;
    channel?: "email" | "push" | "in_app" | undefined;
    readStatus?: "read" | "unread" | undefined;
}, {
    type?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    channel?: "email" | "push" | "in_app" | undefined;
    readStatus?: "read" | "unread" | undefined;
}>;
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
/** PATCH /notifications/:id/read path param. */
export declare const notificationIdParamsSchema: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
export type NotificationIdParams = z.infer<typeof notificationIdParamsSchema>;
/** PATCH /notifications/mark-all-read body — optional readStatus scope. */
export declare const markAllReadSchema: z.ZodObject<{
    readStatus: z.ZodOptional<z.ZodEnum<["read", "unread"]>>;
}, "strip", z.ZodTypeAny, {
    readStatus?: "read" | "unread" | undefined;
}, {
    readStatus?: "read" | "unread" | undefined;
}>;
export type MarkAllReadInput = z.infer<typeof markAllReadSchema>;
