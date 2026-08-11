import { Router, type Request, type Response } from "express";
import { isValidObjectId } from "mongoose";
import {
  conflictsQuerySchema,
  createEventSchema,
  listEventsQuerySchema,
  occurrenceParamsSchema,
  occurrenceUpdateSchema,
  updateEventSchema,
  type CalendarOccurrence
} from "@lifeos/shared";
import { Event, type EventDoc } from "../models/Event.js";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  dateKeyInZone,
  describeRecurrence,
  exceptionByDateKey,
  expandRange,
  filterOverlapping,
  isValidTimezone,
  parseOccurrenceId,
  utcMidnightForKey,
  validateRecurrenceRule
} from "../services/recurrence.js";
import { enqueueEmbeddingJob, deleteEmbedding } from "../services/ai/embeddingJob.js";
import {
  cancelEventReminder,
  scheduleEventReminder
} from "../services/notifications/calendarReminders.js";

export const calendarRouter = Router();

function formatEventDetail(doc: EventDoc) {
  return {
    id: doc._id.toString(),
    title: doc.title,
    description: doc.description ?? "",
    location: doc.location ?? "",
    startTime: new Date(doc.startTime).toISOString(),
    endTime: new Date(doc.endTime).toISOString(),
    timezone: doc.timezone,
    isAllDay: Boolean(doc.isAllDay),
    isRecurring: Boolean(doc.recurrenceRule),
    recurrenceRule: doc.recurrenceRule ?? null,
    recurrenceEndDate: doc.recurrenceEndDate ? new Date(doc.recurrenceEndDate).toISOString() : null,
    recurrence: describeRecurrence(doc.recurrenceRule ?? null),
    reminderLeadMinutes: doc.reminderLeadMinutes ?? null,
    exceptions: (doc.exceptions || []).map((e: any) => ({
      originalDate: new Date(e.originalDate).toISOString(),
      isCancelled: Boolean(e.isCancelled),
      overrideEventId: e.overrideEventId ? e.overrideEventId.toString() : null
    }))
  };
}

// Load every override document referenced by a batch of series docs so
// expansion can substitute instance-specific titles/times.
async function collectOverrides(events: EventDoc[]): Promise<Map<string, EventDoc>> {
  const ids = new Set<string>();
  for (const event of events) {
    for (const exception of event.exceptions || []) {
      if (exception.overrideEventId) ids.add(exception.overrideEventId.toString());
    }
  }
  if (ids.size === 0) return new Map();
  const docs = await Event.find({ _id: { $in: [...ids] } });
  return new Map(docs.map((d) => [d._id.toString(), d]));
}

// Shared predicate for finding candidate events that could overlap a window.
// Recurring events can't be range-filtered exactly in the DB (the rule needs
// expanding), so we pre-filter them on a rough bound then expand in memory.
function overlapWindowQuery(
  userId: any,
  start: Date,
  end: Date,
  exclude?: { _id: { $ne: string } }
) {
  return {
    userId,
    isOverride: { $ne: true },
    ...exclude,
    $or: [
      { recurrenceRule: null, startTime: { $lt: end }, endTime: { $gt: start } },
      {
        recurrenceRule: { $ne: null },
        startTime: { $lte: end },
        $or: [{ recurrenceEndDate: null }, { recurrenceEndDate: { $gte: start } }]
      }
    ]
  };
}

function safeExclude(excludeEventId?: string) {
  if (!excludeEventId) return undefined;
  if (!isValidObjectId(excludeEventId)) return { _id: { $ne: "" } };
  return { _id: { $ne: excludeEventId } };
}

function occurrenceFor(values: {
  occurrenceId: string;
  eventId: string;
  title: string;
  description: string;
  location: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
  isAllDay: boolean;
}): CalendarOccurrence {
  return {
    occurrenceId: values.occurrenceId,
    eventId: values.eventId,
    title: values.title,
    description: values.description,
    location: values.location,
    startTime: values.startTime.toISOString(),
    endTime: values.endTime.toISOString(),
    timezone: values.timezone,
    isAllDay: values.isAllDay,
    isRecurring: true,
    isOverridden: true
  };
}

/**
 * @openapi
 * /calendar/events:
 *   post:
 *     tags: [Calendar]
 *     summary: Create an event (or a recurring series)
 *     description: |
 *       Creates a calendar event. All times are stored in UTC; the creating
 *       client's IANA timezone is stored alongside so display can be
 *       timezone-correct later. A series is stored as ONE document — pass an
 *       RFC 5545 `recurrenceRule` (e.g. `FREQ=WEEKLY;BYDAY=MO,WE`) and
 *       occurrences are expanded at read time, never written out.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, startTime, endTime, timezone]
 *             properties:
 *               title: { type: string, example: Weekly Design Review }
 *               description: { type: string, example: Stand-up + design sync }
 *               location: { type: string, example: Zoom }
 *               startTime: { type: string, format: date-time, example: 2026-08-03T13:00:00.000Z }
 *               endTime: { type: string, format: date-time, example: 2026-08-03T13:30:00.000Z }
 *               timezone: { type: string, example: America/New_York }
 *               isAllDay: { type: boolean, default: false }
 *               recurrenceRule:
 *                 type: string
 *                 nullable: true
 *                 example: FREQ=WEEKLY;BYDAY=MO,WE
 *               recurrenceEndDate:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *                 example: 2026-12-31T00:00:00.000Z
 *               reminderLeadMinutes:
 *                 type: integer
 *                 nullable: true
 *                 example: 15
 *     responses:
 *       201:
 *         description: Event created. Returns the stored source document.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/CalendarEventDetail"
 *       400:
 *         description: Validation error — malformed RRULE or endTime before startTime
 *       401:
 *         description: Authentication required
 */
calendarRouter.post(
  "/calendar/events",
  requireAuth,
  validate(createEventSchema),
  async (req: Request, res: Response) => {
    try {
      const body = req.body;
      const userId = req.user!._id;
      const startTime = new Date(body.startTime);
      const endTime = new Date(body.endTime);

      if (!isValidTimezone(body.timezone)) {
        return res.status(400).json({
          error: "ValidationError",
          message: `"${body.timezone}" is not a valid IANA timezone.`
        });
      }

      if (body.recurrenceRule) {
        try {
          validateRecurrenceRule(body.recurrenceRule, startTime, body.timezone);
        } catch (err: any) {
          return res.status(400).json({ error: "ValidationError", message: err.message });
        }
      }

      const doc = await Event.create({
        userId,
        title: body.title,
        description: body.description,
        location: body.location,
        startTime,
        endTime,
        timezone: body.timezone,
        isAllDay: body.isAllDay,
        recurrenceRule: body.recurrenceRule || null,
        recurrenceEndDate: body.recurrenceEndDate ? new Date(body.recurrenceEndDate) : null,
        reminderLeadMinutes: body.reminderLeadMinutes ?? null
      });

      if (!doc.recurrenceRule && doc.reminderLeadMinutes != null) {
        const jobId = await scheduleEventReminder(doc);
        if (jobId) {
          doc.reminderJobId = jobId;
          await doc.save();
        }
      }

      await enqueueEmbeddingJob("event", doc._id, userId);

      return res.status(201).json({ event: formatEventDetail(doc) });
    } catch (err) {
      return res
        .status(500)
        .json({ error: "InternalServerError", message: "Failed to create event" });
    }
  }
);

/**
 * @openapi
 * /calendar/events:
 *   get:
 *     tags: [Calendar]
 *     summary: List expanded event occurrences in a range
 *     description: |
 *       Returns the EXPANDED occurrences overlapping [rangeStart, rangeEnd] as
 *       flat objects. Unlike the stored document, every occurrence carries a
 *       deterministic `occurrenceId` (eventId + occurrence start) so the
 *       client can address a single instance of a series without ever
 *       re-implementing recurrence math. Raw RRULE strings are never returned
 *       here — recurring occurrences simply set `isRecurring: true`.
 *
 *       Range is required and must span at most ~1 year; unbounded expansion
 *       is rejected with a 400.
 *
 *       Example — an event created with
 *       `recurrenceRule: "FREQ=WEEKLY;BYDAY=MO"` and `startTime: 09:00`:
 *       ```json
 *       {
 *         "events": [
 *           {
 *             "occurrenceId": "662c9f1e...@2026-08-03T13:00:00.000Z",
 *             "eventId": "662c9f1e...",
 *             "title": "Standup",
 *             "description": "",
 *             "location": "",
 *             "startTime": "2026-08-03T13:00:00.000Z",
 *             "endTime": "2026-08-03T13:30:00.000Z",
 *             "timezone": "America/New_York",
 *             "isAllDay": false,
 *             "isRecurring": true,
 *             "isOverridden": false
 *           }
 *         ]
 *       }
 *       ```
 *     parameters:
 *       - name: rangeStart
 *         in: query
 *         required: true
 *         schema: { type: string, format: date-time }
 *         description: Start of the window (inclusive), ISO 8601.
 *       - name: rangeEnd
 *         in: query
 *         required: true
 *         schema: { type: string, format: date-time }
 *         description: End of the window (exclusive), ISO 8601. Must be within ~1 year of rangeStart.
 *       - name: view
 *         in: query
 *         required: false
 *         schema: { type: string, enum: [day, week, month] }
 *         description: Informational only — the server does not change its logic based on this.
 *     responses:
 *       200:
 *         description: Expanded occurrences within the range.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 events:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/CalendarOccurrence"
 *       400:
 *         description: Missing range params, or range spans more than ~1 year
 *       401:
 *         description: Authentication required
 */
calendarRouter.get(
  "/calendar/events",
  requireAuth,
  validate(listEventsQuerySchema, "query"),
  async (req: Request, res: Response) => {
    try {
      const query = req.query as { rangeStart: string; rangeEnd: string };
      const start = new Date(query.rangeStart);
      const end = new Date(query.rangeEnd);
      const userId = req.user!._id;

      const events = await Event.find(overlapWindowQuery(userId, start, end));
      const overrides = await collectOverrides(events);
      const occurrences = expandRange(events, start, end, overrides);

      return res.json({ events: occurrences });
    } catch {
      return res
        .status(500)
        .json({ error: "InternalServerError", message: "Failed to list events" });
    }
  }
);

/**
 * @openapi
 * /calendar/events/conflicts:
 *   get:
 *     tags: [Calendar]
 *     summary: Detect overlapping events for a candidate time window
 *     description: |
 *       Deliberately simple overlap detection: given a candidate
 *       startTime/endTime, return any of the caller's events that overlap it
 *       (including partial overlaps, and including occurrences of recurring
 *       series). Purely informational — the client shows a non-blocking
 *       warning; it does not hard-block saving. AI-driven conflict suggestions
 *       are Phase 3 territory.
 *     parameters:
 *       - name: startTime
 *         in: query
 *         required: true
 *         schema: { type: string, format: date-time }
 *       - name: endTime
 *         in: query
 *         required: true
 *         schema: { type: string, format: date-time }
 *       - name: excludeEventId
 *         in: query
 *         required: false
 *         schema: { type: string }
 *         description: Event id to ignore (use when editing that event/series).
 *       - name: excludeOccurrenceId
 *         in: query
 *         required: false
 *         schema: { type: string }
 *         description: Occurrence id to ignore (use when editing a single instance of a series).
 *     responses:
 *       200:
 *         description: Overlapping events (may be empty).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 conflicts:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/CalendarOccurrence"
 *       400:
 *         description: Missing or invalid startTime/endTime
 *       401:
 *         description: Authentication required
 */
calendarRouter.get(
  "/calendar/events/conflicts",
  requireAuth,
  validate(conflictsQuerySchema, "query"),
  async (req: Request, res: Response) => {
    try {
      const query = req.query as {
        startTime: string;
        endTime: string;
        excludeEventId?: string;
        excludeOccurrenceId?: string;
      };
      const start = new Date(query.startTime);
      const end = new Date(query.endTime);
      const userId = req.user!._id;

      const events = await Event.find(
        overlapWindowQuery(userId, start, end, safeExclude(query.excludeEventId))
      );
      const overrides = await collectOverrides(events);
      const occurrences = expandRange(events, start, end, overrides);

      const conflicts = filterOverlapping(occurrences, start, end, query.excludeOccurrenceId);

      return res.json({ conflicts });
    } catch {
      return res
        .status(500)
        .json({ error: "InternalServerError", message: "Failed to detect conflicts" });
    }
  }
);

/**
 * @openapi
 * /calendar/events/{id}:
 *   get:
 *     tags: [Calendar]
 *     summary: Get a single event (the stored source document)
 *     description: |
 *       Returns the SOURCE document, not an expanded occurrence — used to
 *       populate the edit form. Unlike list responses this includes the
 *       recurrence metadata the form needs: a structured `recurrence`
 *       descriptor (never the raw RRULE string) plus the raw string and
 *       exception list for series-aware editing.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: The stored event document.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/CalendarEventDetail"
 *       404:
 *         description: Event not found (or not owned by this user)
 *       401:
 *         description: Authentication required
 */
calendarRouter.get("/calendar/events/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const doc = await Event.findOne({ _id: req.params.id, userId: req.user!._id });
    if (!doc) {
      return res.status(404).json({ error: "NotFound", message: "Event not found." });
    }
    return res.json({ event: formatEventDetail(doc) });
  } catch {
    return res.status(500).json({ error: "InternalServerError", message: "Failed to get event" });
  }
});

/**
 * @openapi
 * /calendar/events/{id}:
 *   patch:
 *     tags: [Calendar]
 *     summary: Update an entire event or recurring series
 *     description: |
 *       Updates the whole series. The request body may include
 *       `scope: "series"` (the default) to make the intent explicit; sending
 *       `scope: "occurrence"` returns a 400 directing you to the
 *       occurrence-scoped endpoint. Existing single-instance exceptions are
 *       preserved unless the series stops recurring.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               location: { type: string }
 *               startTime: { type: string, format: date-time }
 *               endTime: { type: string, format: date-time }
 *               timezone: { type: string }
 *               isAllDay: { type: boolean }
 *               recurrenceRule: { type: string, nullable: true }
 *               recurrenceEndDate: { type: string, format: date-time, nullable: true }
 *               reminderLeadMinutes: { type: integer, nullable: true, example: 15 }
 *               scope: { type: string, enum: [series, occurrence], default: series }
 *     responses:
 *       200:
 *         description: The updated event document.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/CalendarEventDetail"
 *       400:
 *         description: Validation error, malformed RRULE, or occurrence scope on series endpoint
 *       404:
 *         description: Event not found
 *       401:
 *         description: Authentication required
 */
calendarRouter.patch(
  "/calendar/events/:id",
  requireAuth,
  validate(updateEventSchema),
  async (req: Request, res: Response) => {
    try {
      const body = req.body;
      const doc = await Event.findOne({ _id: req.params.id, userId: req.user!._id });
      if (!doc) {
        return res.status(404).json({ error: "NotFound", message: "Event not found." });
      }

      if (body.scope === "occurrence") {
        return res.status(400).json({
          error: "BadRequest",
          message:
            "Use PATCH /calendar/events/:id/occurrence/:occurrenceId to edit a single instance."
        });
      }

      if (body.timezone !== undefined) {
        if (!isValidTimezone(body.timezone)) {
          return res.status(400).json({
            error: "ValidationError",
            message: `"${body.timezone}" is not a valid IANA timezone.`
          });
        }
        doc.timezone = body.timezone;
      }
      if (body.title !== undefined) doc.title = body.title;
      if (body.description !== undefined) doc.description = body.description;
      if (body.location !== undefined) doc.location = body.location;
      if (body.isAllDay !== undefined) doc.isAllDay = body.isAllDay;
      if (body.startTime !== undefined) doc.startTime = new Date(body.startTime);
      if (body.endTime !== undefined) doc.endTime = new Date(body.endTime);
      if (body.recurrenceRule !== undefined) {
        if (body.recurrenceRule) {
          try {
            validateRecurrenceRule(body.recurrenceRule, new Date(doc.startTime), doc.timezone);
          } catch (err: any) {
            return res.status(400).json({ error: "ValidationError", message: err.message });
          }
        }
        doc.recurrenceRule = body.recurrenceRule;
        if (!body.recurrenceRule) {
          doc.recurrenceEndDate = null;
          doc.exceptions.splice(0, doc.exceptions.length);
        }
      }
      if (body.recurrenceEndDate !== undefined) {
        doc.recurrenceEndDate = body.recurrenceEndDate ? new Date(body.recurrenceEndDate) : null;
      }
      if (body.reminderLeadMinutes !== undefined) {
        doc.reminderLeadMinutes = body.reminderLeadMinutes;
      }

      if (doc.startTime >= doc.endTime) {
        return res.status(400).json({
          error: "ValidationError",
          message: "endTime must be after startTime."
        });
      }

      // Cancel previous reminder job if time/lead-time/recurrence changed
      if (doc.reminderJobId) {
        await cancelEventReminder(doc.reminderJobId);
        doc.reminderJobId = null;
      }

      // Re-schedule reminder job for non-recurring events if lead time is set
      if (!doc.recurrenceRule && doc.reminderLeadMinutes != null) {
        doc.reminderJobId = await scheduleEventReminder(doc);
      }

      await doc.save();
      await enqueueEmbeddingJob("event", doc._id, req.user!._id);

      return res.json({ event: formatEventDetail(doc) });
    } catch {
      return res
        .status(500)
        .json({ error: "InternalServerError", message: "Failed to update event" });
    }
  }
);

/**
 * @openapi
 * /calendar/events/{id}/occurrence/{occurrenceId}:
 *   patch:
 *     tags: [Calendar]
 *     summary: Edit a single occurrence of a recurring series
 *     description: |
 *       Changes one instance ("this event, moved") without touching the rest
 *       of the series. Records an entry in the parent's `exceptions` array and
 *       creates or updates a lightweight override document whose title/times
 *       replace the series defaults for just that date. `occurrenceId` is the
 *       deterministic id returned by GET /calendar/events.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *         description: The series event id.
 *       - name: occurrenceId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *         description: Deterministic occurrence id (eventId@ISO-start).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               location: { type: string }
 *               startTime: { type: string, format: date-time }
 *               endTime: { type: string, format: date-time }
 *               isAllDay: { type: boolean }
 *     responses:
 *       200:
 *         description: The updated occurrence.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 occurrence:
 *                   $ref: "#/components/schemas/CalendarOccurrence"
 *       400:
 *         description: Event is not a recurring series, or invalid occurrenceId
 *       404:
 *         description: Event not found
 *       401:
 *         description: Authentication required
 */
calendarRouter.patch(
  "/calendar/events/:id/occurrence/:occurrenceId",
  requireAuth,
  validate(occurrenceParamsSchema, "params"),
  validate(occurrenceUpdateSchema),
  async (req: Request, res: Response) => {
    try {
      const { id, occurrenceId } = req.params as { id: string; occurrenceId: string };
      const body = req.body;
      const userId = req.user!._id;

      const doc = await Event.findOne({ _id: id, userId });
      if (!doc) {
        return res.status(404).json({ error: "NotFound", message: "Event not found." });
      }
      if (!doc.recurrenceRule) {
        return res.status(400).json({
          error: "BadRequest",
          message: "This event is not a recurring series and cannot have single-instance edits."
        });
      }

      const parsed = parseOccurrenceId(occurrenceId);
      if (!parsed || parsed.eventId !== id) {
        return res.status(400).json({ error: "BadRequest", message: "Invalid occurrenceId." });
      }

      const key = dateKeyInZone(parsed.occurrenceStart, doc.timezone);

      const values = {
        title: body.title ?? doc.title,
        description: body.description ?? doc.description,
        location: body.location ?? doc.location,
        startTime: body.startTime ? new Date(body.startTime) : new Date(doc.startTime),
        endTime: body.endTime ? new Date(body.endTime) : new Date(doc.endTime),
        isAllDay: body.isAllDay ?? doc.isAllDay
      };
      if (values.startTime >= values.endTime) {
        return res.status(400).json({
          error: "ValidationError",
          message: "endTime must be after startTime."
        });
      }

      const existing = exceptionByDateKey(doc, key);
      let overrideId: string;

      if (existing?.overrideEventId) {
        const override = await Event.findOneAndUpdate(
          { _id: existing.overrideEventId, parentEventId: doc._id, userId },
          {
            $set: {
              title: values.title,
              description: values.description,
              location: values.location,
              startTime: values.startTime,
              endTime: values.endTime,
              isAllDay: values.isAllDay
            }
          },
          { new: true }
        );
        if (!override) {
          return res.status(404).json({ error: "NotFound", message: "Override event not found." });
        }
        overrideId = override._id.toString();
      } else {
        const override = await Event.create({
          userId,
          parentEventId: doc._id,
          isOverride: true,
          title: values.title,
          description: values.description,
          location: values.location,
          startTime: values.startTime,
          endTime: values.endTime,
          timezone: doc.timezone,
          isAllDay: values.isAllDay,
          recurrenceRule: null,
          exceptions: []
        });
        overrideId = override._id.toString();
      }

      const existingEntry = exceptionByDateKey(doc, key);
      if (existingEntry) {
        existingEntry.isCancelled = false;
        existingEntry.overrideEventId = overrideId;
      } else {
        doc.exceptions.push({
          originalDate: utcMidnightForKey(key),
          isCancelled: false,
          overrideEventId: overrideId
        });
      }
      await doc.save();

      const occurrence = occurrenceFor({
        occurrenceId,
        eventId: id,
        title: values.title,
        description: values.description,
        location: values.location,
        startTime: values.startTime,
        endTime: values.endTime,
        timezone: doc.timezone,
        isAllDay: values.isAllDay
      });

      return res.json({ occurrence });
    } catch {
      return res
        .status(500)
        .json({ error: "InternalServerError", message: "Failed to update occurrence" });
    }
  }
);

/**
 * @openapi
 * /calendar/events/{id}/occurrence/{occurrenceId}:
 *   delete:
 *     tags: [Calendar]
 *     summary: Delete a single occurrence of a recurring series
 *     description: |
 *       Marks that instance as cancelled in the parent's `exceptions` array
 *       ("this event, deleted") without touching the rest of the series.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *       - name: occurrenceId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Occurrence cancelled
 *       400:
 *         description: Event is not a recurring series, or invalid occurrenceId
 *       404:
 *         description: Event not found
 *       401:
 *         description: Authentication required
 */
calendarRouter.delete(
  "/calendar/events/:id/occurrence/:occurrenceId",
  requireAuth,
  validate(occurrenceParamsSchema, "params"),
  async (req: Request, res: Response) => {
    try {
      const { id, occurrenceId } = req.params as { id: string; occurrenceId: string };
      const doc = await Event.findOne({ _id: id, userId: req.user!._id });
      if (!doc) {
        return res.status(404).json({ error: "NotFound", message: "Event not found." });
      }
      if (!doc.recurrenceRule) {
        return res.status(400).json({
          error: "BadRequest",
          message: "This event is not a recurring series and cannot have single-instance edits."
        });
      }

      const parsed = parseOccurrenceId(occurrenceId);
      if (!parsed || parsed.eventId !== id) {
        return res.status(400).json({ error: "BadRequest", message: "Invalid occurrenceId." });
      }

      const key = dateKeyInZone(parsed.occurrenceStart, doc.timezone);
      const existing = exceptionByDateKey(doc, key);
      if (existing) {
        existing.isCancelled = true;
        existing.overrideEventId = null;
      } else {
        doc.exceptions.push({
          originalDate: utcMidnightForKey(key),
          isCancelled: true,
          overrideEventId: null
        });
      }
      await doc.save();

      return res.json({ message: "Occurrence deleted." });
    } catch {
      return res
        .status(500)
        .json({ error: "InternalServerError", message: "Failed to delete occurrence" });
    }
  }
);

/**
 * @openapi
 * /calendar/events/{id}:
 *   delete:
 *     tags: [Calendar]
 *     summary: Delete an entire event or recurring series
 *     description: |
 *       Deletes the whole series and any single-instance override documents
 *       attached to it. The frontend is responsible for confirmation; the
 *       backend does not require it.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Series deleted
 *       404:
 *         description: Event not found
 *       401:
 *         description: Authentication required
 */
calendarRouter.delete("/calendar/events/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const doc = await Event.findOne({ _id: req.params.id, userId: req.user!._id });
    if (!doc) {
      return res.status(404).json({ error: "NotFound", message: "Event not found." });
    }
    if (doc.reminderJobId) {
      await cancelEventReminder(doc.reminderJobId);
    }
    await Event.deleteMany({ $or: [{ _id: doc._id }, { parentEventId: doc._id }] });
    await deleteEmbedding("event", doc._id);

    return res.json({ message: "Event series deleted." });
  } catch {
    return res
      .status(500)
      .json({ error: "InternalServerError", message: "Failed to delete event" });
  }
});

/**
 * @openapi
 * components:
 *   schemas:
 *     CalendarOccurrence:
 *       type: object
 *       description: |
 *         One expanded instance of an event, as returned by GET /calendar/events.
 *         Differs from the stored document: recurring series are expanded at
 *         read time and each instance gets a deterministic `occurrenceId` so
 *         single instances can be addressed directly.
 *       required: [occurrenceId, eventId, title, startTime, endTime, timezone, isAllDay, isRecurring, isOverridden]
 *       properties:
 *         occurrenceId:
 *           type: string
 *           example: 662c9f1e9f0b2a001c3d4e5f@2026-08-03T13:00:00.000Z
 *         eventId:
 *           type: string
 *           example: 662c9f1e9f0b2a001c3d4e5f
 *         title: { type: string, example: Weekly Design Review }
 *         description: { type: string, example: Stand-up + design sync }
 *         location: { type: string, example: Zoom }
 *         startTime: { type: string, format: date-time }
 *         endTime: { type: string, format: date-time }
 *         timezone: { type: string, example: America/New_York }
 *         isAllDay: { type: boolean }
 *         isRecurring:
 *           type: boolean
 *           description: True when the occurrence belongs to a recurring series.
 *         isOverridden:
 *           type: boolean
 *           description: True when this instance has a single-instance override (edited just this date).
 *     CalendarEventDetail:
 *       type: object
 *       description: |
 *         The stored source document for one event or series, returned by
 *         GET /calendar/events/{id} and create/update responses. Recurrence is
 *         exposed as a structured `recurrence` descriptor (never the raw RRULE
 *         string) so the edit form can prefill its controls.
 *       required: [id, title, startTime, endTime, timezone, isAllDay, isRecurring]
 *       properties:
 *         id: { type: string }
 *         title: { type: string }
 *         description: { type: string }
 *         location: { type: string }
 *         startTime: { type: string, format: date-time }
 *         endTime: { type: string, format: date-time }
 *         timezone: { type: string }
 *         isAllDay: { type: boolean }
 *         isRecurring: { type: boolean }
 *         recurrenceRule: { type: string, nullable: true }
 *         recurrenceEndDate: { type: string, format: date-time, nullable: true }
 *         reminderLeadMinutes: { type: integer, nullable: true, example: 10 }
 *         recurrence:
 *           type: object
 *           nullable: true
 *           properties:
 *             frequency: { type: string, enum: [daily, weekly, monthly, yearly, custom] }
 *             interval: { type: integer }
 *             byDay:
 *               type: array
 *               items: { type: string, example: MO }
 *             endType: { type: string, enum: [never, onDate, after] }
 *             until: { type: string, format: date-time, nullable: true }
 *             count: { type: integer, nullable: true }
 *         exceptions:
 *           type: array
 *           description: Single-instance edits applied to this series.
 *           items:
 *             type: object
 *             properties:
 *               originalDate: { type: string, format: date-time }
 *               isCancelled: { type: boolean }
 *               overrideEventId: { type: string, nullable: true }
 */
