import { z } from "zod";

const isoDateTime = () => z.string().datetime({ offset: true });

const MAX_RANGE_SPAN_DAYS = 366;

/**
 * Structured description of a recurrence rule, the ONLY shape the calendar
 * UI ever deals with. The client never sees or parses raw RRULE syntax —
 * it builds one of these from simple controls and sends it up, and the API
 * converts it to an RFC 5545 RRULE string (or returns this shape when the
 * edit form needs to prefill its "Repeat" controls).
 */
export const recurrenceDescriptorSchema = z.object({
  frequency: z.enum(["daily", "weekly", "monthly", "yearly", "custom"]),
  interval: z.number().int().positive().default(1),
  byDay: z.array(z.string()).optional(),
  endType: z.enum(["never", "onDate", "after"]),
  until: z.string().optional(),
  count: z.number().int().positive().optional()
});

export type RecurrenceDescriptor = z.infer<typeof recurrenceDescriptorSchema>;

/**
 * A single expanded occurrence returned by GET /events. This is what every
 * calendar view renders. Note it differs from the stored document shape:
 * occurrences carry a deterministic `occurrenceId` so the client can address
 * one instance of a recurring series (edit/delete just this one).
 */
export const calendarOccurrenceSchema = z.object({
  occurrenceId: z.string(),
  eventId: z.string(),
  title: z.string(),
  description: z.string(),
  location: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  timezone: z.string(),
  isAllDay: z.boolean(),
  isRecurring: z.boolean(),
  isOverridden: z.boolean(),
  linkedTopicId: z.string().nullable().optional()
});

export type CalendarOccurrence = z.infer<typeof calendarOccurrenceSchema>;

export const calendarExceptionSchema = z.object({
  originalDate: z.string(),
  isCancelled: z.boolean(),
  overrideEventId: z.string().nullable()
});

export type CalendarException = z.infer<typeof calendarExceptionSchema>;

/**
 * The stored source document for a single event or series, used by the edit
 * form. `recurrence` is the structured descriptor (never the raw RRULE
 * string) so the client can prefill its Repeat controls without re-parsing
 * RFC 5545 syntax.
 */
export const calendarEventDetailSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  location: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  timezone: z.string(),
  isAllDay: z.boolean(),
  isRecurring: z.boolean(),
  recurrenceRule: z.string().nullable(),
  recurrenceEndDate: z.string().nullable(),
  recurrence: recurrenceDescriptorSchema.nullable(),
  reminderLeadMinutes: z.number().int().min(0).nullable().optional(),
  exceptions: z.array(calendarExceptionSchema).optional(),
  linkedTopicId: z.string().nullable().optional()
});

export type CalendarEventDetail = z.infer<typeof calendarEventDetailSchema>;

interface StartEndTimes {
  startTime?: string;
  endTime?: string;
}

function refineStartBeforeEnd(data: StartEndTimes, ctx: z.RefinementCtx) {
  const start = data.startTime ? Date.parse(data.startTime) : Number.NaN;
  const end = data.endTime ? Date.parse(data.endTime) : Number.NaN;
  if (!Number.isNaN(start) && !Number.isNaN(end) && start >= end) {
    ctx.addIssue({
      code: "custom",
      path: ["endTime"],
      message: "endTime must be after startTime"
    });
  }
}

export const createEventSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(300).trim(),
    description: z.string().max(5000).optional().default(""),
    location: z.string().max(500).optional().default(""),
    startTime: isoDateTime(),
    endTime: isoDateTime(),
    timezone: z.string().min(1, "timezone is required"),
    isAllDay: z.boolean().optional().default(false),
    recurrenceRule: z.string().max(2000).nullable().optional().default(null),
    recurrenceEndDate: isoDateTime().nullable().optional().default(null),
    reminderLeadMinutes: z.number().int().min(0).nullable().optional().default(null),
    linkedTopicId: z.string().nullable().optional()
  })
  .superRefine(refineStartBeforeEnd);

export type CreateEventInput = z.infer<typeof createEventSchema>;

export const updateEventSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(300).trim().optional(),
    description: z.string().max(5000).optional(),
    location: z.string().max(500).optional(),
    startTime: isoDateTime().optional(),
    endTime: isoDateTime().optional(),
    timezone: z.string().min(1).optional(),
    isAllDay: z.boolean().optional(),
    recurrenceRule: z.string().max(2000).nullable().optional(),
    recurrenceEndDate: isoDateTime().nullable().optional(),
    reminderLeadMinutes: z.number().int().min(0).nullable().optional(),
    linkedTopicId: z.string().nullable().optional(),
    scope: z.enum(["series", "occurrence"]).optional().default("series")
  })
  .superRefine(refineStartBeforeEnd);

export type UpdateEventInput = z.infer<typeof updateEventSchema>;

export const occurrenceUpdateSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(300).trim().optional(),
    description: z.string().max(5000).optional(),
    location: z.string().max(500).optional(),
    startTime: isoDateTime().optional(),
    endTime: isoDateTime().optional(),
    isAllDay: z.boolean().optional()
  })
  .superRefine(refineStartBeforeEnd);

export type OccurrenceUpdateInput = z.infer<typeof occurrenceUpdateSchema>;

export const listEventsQuerySchema = z
  .object({
    rangeStart: isoDateTime(),
    rangeEnd: isoDateTime(),
    view: z.enum(["day", "week", "month"]).optional()
  })
  .superRefine((data, ctx) => {
    const start = Date.parse(data.rangeStart);
    const end = Date.parse(data.rangeEnd);
    if (Number.isNaN(start) || Number.isNaN(end)) {
      ctx.addIssue({
        code: "custom",
        message: "rangeStart and rangeEnd are required and must be valid ISO datetimes"
      });
      return;
    }
    if (end <= start) {
      ctx.addIssue({ code: "custom", message: "rangeEnd must be after rangeStart" });
      return;
    }
    const spanDays = (end - start) / 86_400_000;
    if (spanDays > MAX_RANGE_SPAN_DAYS) {
      ctx.addIssue({
        code: "custom",
        message: `Requested range spans more than ${MAX_RANGE_SPAN_DAYS} days. Narrow the range — unbounded recurrence expansion is not allowed.`
      });
    }
  });

export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;

export const conflictsQuerySchema = z
  .object({
    startTime: isoDateTime(),
    endTime: isoDateTime(),
    excludeEventId: z.string().optional(),
    excludeOccurrenceId: z.string().optional()
  })
  .superRefine((data, ctx) => {
    const start = Date.parse(data.startTime);
    const end = Date.parse(data.endTime);
    if (Number.isNaN(start) || Number.isNaN(end)) {
      ctx.addIssue({
        code: "custom",
        message: "startTime and endTime are required and must be valid ISO datetimes"
      });
      return;
    }
    if (end <= start) {
      ctx.addIssue({ code: "custom", message: "endTime must be after startTime" });
    }
  });

export type ConflictsQuery = z.infer<typeof conflictsQuerySchema>;

export const occurrenceParamsSchema = z.object({
  id: z.string().min(1, "event id is required"),
  occurrenceId: z.string().min(1, "occurrenceId is required")
});

export type OccurrenceParams = z.infer<typeof occurrenceParamsSchema>;
