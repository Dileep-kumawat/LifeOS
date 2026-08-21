import { z } from "zod";
/**
 * Structured description of a recurrence rule, the ONLY shape the calendar
 * UI ever deals with. The client never sees or parses raw RRULE syntax —
 * it builds one of these from simple controls and sends it up, and the API
 * converts it to an RFC 5545 RRULE string (or returns this shape when the
 * edit form needs to prefill its "Repeat" controls).
 */
export declare const recurrenceDescriptorSchema: z.ZodObject<{
    frequency: z.ZodEnum<["daily", "weekly", "monthly", "yearly", "custom"]>;
    interval: z.ZodDefault<z.ZodNumber>;
    byDay: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    endType: z.ZodEnum<["never", "onDate", "after"]>;
    until: z.ZodOptional<z.ZodString>;
    count: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    frequency: "custom" | "daily" | "weekly" | "monthly" | "yearly";
    interval: number;
    endType: "never" | "onDate" | "after";
    byDay?: string[] | undefined;
    until?: string | undefined;
    count?: number | undefined;
}, {
    frequency: "custom" | "daily" | "weekly" | "monthly" | "yearly";
    endType: "never" | "onDate" | "after";
    interval?: number | undefined;
    byDay?: string[] | undefined;
    until?: string | undefined;
    count?: number | undefined;
}>;
export type RecurrenceDescriptor = z.infer<typeof recurrenceDescriptorSchema>;
/**
 * A single expanded occurrence returned by GET /events. This is what every
 * calendar view renders. Note it differs from the stored document shape:
 * occurrences carry a deterministic `occurrenceId` so the client can address
 * one instance of a recurring series (edit/delete just this one).
 */
export declare const calendarOccurrenceSchema: z.ZodObject<{
    occurrenceId: z.ZodString;
    eventId: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    location: z.ZodString;
    startTime: z.ZodString;
    endTime: z.ZodString;
    timezone: z.ZodString;
    isAllDay: z.ZodBoolean;
    isRecurring: z.ZodBoolean;
    isOverridden: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    occurrenceId: string;
    eventId: string;
    title: string;
    description: string;
    location: string;
    startTime: string;
    endTime: string;
    timezone: string;
    isAllDay: boolean;
    isRecurring: boolean;
    isOverridden: boolean;
}, {
    occurrenceId: string;
    eventId: string;
    title: string;
    description: string;
    location: string;
    startTime: string;
    endTime: string;
    timezone: string;
    isAllDay: boolean;
    isRecurring: boolean;
    isOverridden: boolean;
}>;
export type CalendarOccurrence = z.infer<typeof calendarOccurrenceSchema>;
export declare const calendarExceptionSchema: z.ZodObject<{
    originalDate: z.ZodString;
    isCancelled: z.ZodBoolean;
    overrideEventId: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    originalDate: string;
    isCancelled: boolean;
    overrideEventId: string | null;
}, {
    originalDate: string;
    isCancelled: boolean;
    overrideEventId: string | null;
}>;
export type CalendarException = z.infer<typeof calendarExceptionSchema>;
/**
 * The stored source document for a single event or series, used by the edit
 * form. `recurrence` is the structured descriptor (never the raw RRULE
 * string) so the client can prefill its Repeat controls without re-parsing
 * RFC 5545 syntax.
 */
export declare const calendarEventDetailSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    location: z.ZodString;
    startTime: z.ZodString;
    endTime: z.ZodString;
    timezone: z.ZodString;
    isAllDay: z.ZodBoolean;
    isRecurring: z.ZodBoolean;
    recurrenceRule: z.ZodNullable<z.ZodString>;
    recurrenceEndDate: z.ZodNullable<z.ZodString>;
    recurrence: z.ZodNullable<z.ZodObject<{
        frequency: z.ZodEnum<["daily", "weekly", "monthly", "yearly", "custom"]>;
        interval: z.ZodDefault<z.ZodNumber>;
        byDay: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        endType: z.ZodEnum<["never", "onDate", "after"]>;
        until: z.ZodOptional<z.ZodString>;
        count: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        frequency: "custom" | "daily" | "weekly" | "monthly" | "yearly";
        interval: number;
        endType: "never" | "onDate" | "after";
        byDay?: string[] | undefined;
        until?: string | undefined;
        count?: number | undefined;
    }, {
        frequency: "custom" | "daily" | "weekly" | "monthly" | "yearly";
        endType: "never" | "onDate" | "after";
        interval?: number | undefined;
        byDay?: string[] | undefined;
        until?: string | undefined;
        count?: number | undefined;
    }>>;
    reminderLeadMinutes: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    exceptions: z.ZodOptional<z.ZodArray<z.ZodObject<{
        originalDate: z.ZodString;
        isCancelled: z.ZodBoolean;
        overrideEventId: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        originalDate: string;
        isCancelled: boolean;
        overrideEventId: string | null;
    }, {
        originalDate: string;
        isCancelled: boolean;
        overrideEventId: string | null;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    id: string;
    title: string;
    description: string;
    location: string;
    startTime: string;
    endTime: string;
    timezone: string;
    isAllDay: boolean;
    isRecurring: boolean;
    recurrenceRule: string | null;
    recurrenceEndDate: string | null;
    recurrence: {
        frequency: "custom" | "daily" | "weekly" | "monthly" | "yearly";
        interval: number;
        endType: "never" | "onDate" | "after";
        byDay?: string[] | undefined;
        until?: string | undefined;
        count?: number | undefined;
    } | null;
    reminderLeadMinutes?: number | null | undefined;
    exceptions?: {
        originalDate: string;
        isCancelled: boolean;
        overrideEventId: string | null;
    }[] | undefined;
}, {
    id: string;
    title: string;
    description: string;
    location: string;
    startTime: string;
    endTime: string;
    timezone: string;
    isAllDay: boolean;
    isRecurring: boolean;
    recurrenceRule: string | null;
    recurrenceEndDate: string | null;
    recurrence: {
        frequency: "custom" | "daily" | "weekly" | "monthly" | "yearly";
        endType: "never" | "onDate" | "after";
        interval?: number | undefined;
        byDay?: string[] | undefined;
        until?: string | undefined;
        count?: number | undefined;
    } | null;
    reminderLeadMinutes?: number | null | undefined;
    exceptions?: {
        originalDate: string;
        isCancelled: boolean;
        overrideEventId: string | null;
    }[] | undefined;
}>;
export type CalendarEventDetail = z.infer<typeof calendarEventDetailSchema>;
export declare const createEventSchema: z.ZodEffects<z.ZodObject<{
    title: z.ZodString;
    description: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    location: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    startTime: z.ZodString;
    endTime: z.ZodString;
    timezone: z.ZodString;
    isAllDay: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    recurrenceRule: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    recurrenceEndDate: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    reminderLeadMinutes: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
}, "strip", z.ZodTypeAny, {
    title: string;
    description: string;
    location: string;
    startTime: string;
    endTime: string;
    timezone: string;
    isAllDay: boolean;
    recurrenceRule: string | null;
    recurrenceEndDate: string | null;
    reminderLeadMinutes: number | null;
}, {
    title: string;
    startTime: string;
    endTime: string;
    timezone: string;
    description?: string | undefined;
    location?: string | undefined;
    isAllDay?: boolean | undefined;
    recurrenceRule?: string | null | undefined;
    recurrenceEndDate?: string | null | undefined;
    reminderLeadMinutes?: number | null | undefined;
}>, {
    title: string;
    description: string;
    location: string;
    startTime: string;
    endTime: string;
    timezone: string;
    isAllDay: boolean;
    recurrenceRule: string | null;
    recurrenceEndDate: string | null;
    reminderLeadMinutes: number | null;
}, {
    title: string;
    startTime: string;
    endTime: string;
    timezone: string;
    description?: string | undefined;
    location?: string | undefined;
    isAllDay?: boolean | undefined;
    recurrenceRule?: string | null | undefined;
    recurrenceEndDate?: string | null | undefined;
    reminderLeadMinutes?: number | null | undefined;
}>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
export declare const updateEventSchema: z.ZodEffects<z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
    startTime: z.ZodOptional<z.ZodString>;
    endTime: z.ZodOptional<z.ZodString>;
    timezone: z.ZodOptional<z.ZodString>;
    isAllDay: z.ZodOptional<z.ZodBoolean>;
    recurrenceRule: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    recurrenceEndDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    reminderLeadMinutes: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    scope: z.ZodDefault<z.ZodOptional<z.ZodEnum<["series", "occurrence"]>>>;
}, "strip", z.ZodTypeAny, {
    scope: "series" | "occurrence";
    title?: string | undefined;
    description?: string | undefined;
    location?: string | undefined;
    startTime?: string | undefined;
    endTime?: string | undefined;
    timezone?: string | undefined;
    isAllDay?: boolean | undefined;
    recurrenceRule?: string | null | undefined;
    recurrenceEndDate?: string | null | undefined;
    reminderLeadMinutes?: number | null | undefined;
}, {
    title?: string | undefined;
    description?: string | undefined;
    location?: string | undefined;
    startTime?: string | undefined;
    endTime?: string | undefined;
    timezone?: string | undefined;
    isAllDay?: boolean | undefined;
    recurrenceRule?: string | null | undefined;
    recurrenceEndDate?: string | null | undefined;
    reminderLeadMinutes?: number | null | undefined;
    scope?: "series" | "occurrence" | undefined;
}>, {
    scope: "series" | "occurrence";
    title?: string | undefined;
    description?: string | undefined;
    location?: string | undefined;
    startTime?: string | undefined;
    endTime?: string | undefined;
    timezone?: string | undefined;
    isAllDay?: boolean | undefined;
    recurrenceRule?: string | null | undefined;
    recurrenceEndDate?: string | null | undefined;
    reminderLeadMinutes?: number | null | undefined;
}, {
    title?: string | undefined;
    description?: string | undefined;
    location?: string | undefined;
    startTime?: string | undefined;
    endTime?: string | undefined;
    timezone?: string | undefined;
    isAllDay?: boolean | undefined;
    recurrenceRule?: string | null | undefined;
    recurrenceEndDate?: string | null | undefined;
    reminderLeadMinutes?: number | null | undefined;
    scope?: "series" | "occurrence" | undefined;
}>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export declare const occurrenceUpdateSchema: z.ZodEffects<z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
    startTime: z.ZodOptional<z.ZodString>;
    endTime: z.ZodOptional<z.ZodString>;
    isAllDay: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    title?: string | undefined;
    description?: string | undefined;
    location?: string | undefined;
    startTime?: string | undefined;
    endTime?: string | undefined;
    isAllDay?: boolean | undefined;
}, {
    title?: string | undefined;
    description?: string | undefined;
    location?: string | undefined;
    startTime?: string | undefined;
    endTime?: string | undefined;
    isAllDay?: boolean | undefined;
}>, {
    title?: string | undefined;
    description?: string | undefined;
    location?: string | undefined;
    startTime?: string | undefined;
    endTime?: string | undefined;
    isAllDay?: boolean | undefined;
}, {
    title?: string | undefined;
    description?: string | undefined;
    location?: string | undefined;
    startTime?: string | undefined;
    endTime?: string | undefined;
    isAllDay?: boolean | undefined;
}>;
export type OccurrenceUpdateInput = z.infer<typeof occurrenceUpdateSchema>;
export declare const listEventsQuerySchema: z.ZodEffects<z.ZodObject<{
    rangeStart: z.ZodString;
    rangeEnd: z.ZodString;
    view: z.ZodOptional<z.ZodEnum<["day", "week", "month"]>>;
}, "strip", z.ZodTypeAny, {
    rangeStart: string;
    rangeEnd: string;
    view?: "day" | "week" | "month" | undefined;
}, {
    rangeStart: string;
    rangeEnd: string;
    view?: "day" | "week" | "month" | undefined;
}>, {
    rangeStart: string;
    rangeEnd: string;
    view?: "day" | "week" | "month" | undefined;
}, {
    rangeStart: string;
    rangeEnd: string;
    view?: "day" | "week" | "month" | undefined;
}>;
export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;
export declare const conflictsQuerySchema: z.ZodEffects<z.ZodObject<{
    startTime: z.ZodString;
    endTime: z.ZodString;
    excludeEventId: z.ZodOptional<z.ZodString>;
    excludeOccurrenceId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    startTime: string;
    endTime: string;
    excludeEventId?: string | undefined;
    excludeOccurrenceId?: string | undefined;
}, {
    startTime: string;
    endTime: string;
    excludeEventId?: string | undefined;
    excludeOccurrenceId?: string | undefined;
}>, {
    startTime: string;
    endTime: string;
    excludeEventId?: string | undefined;
    excludeOccurrenceId?: string | undefined;
}, {
    startTime: string;
    endTime: string;
    excludeEventId?: string | undefined;
    excludeOccurrenceId?: string | undefined;
}>;
export type ConflictsQuery = z.infer<typeof conflictsQuerySchema>;
export declare const occurrenceParamsSchema: z.ZodObject<{
    id: z.ZodString;
    occurrenceId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    occurrenceId: string;
}, {
    id: string;
    occurrenceId: string;
}>;
export type OccurrenceParams = z.infer<typeof occurrenceParamsSchema>;
