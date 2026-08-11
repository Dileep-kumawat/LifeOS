import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { Event } from "../../models/Event.js";
import { Habit } from "../../models/Habit.js";
import { Note } from "../../models/Note.js";
import { NoteFolder } from "../../models/NoteFolder.js";
import { isValidTimezone, validateRecurrenceRule } from "../recurrence.js";
import { extractContentText } from "../prosemirror.js";
import { scheduleEventReminder } from "../notifications/calendarReminders.js";
import { enqueueEmbeddingJob } from "./embeddingJob.js";

// ─── 1. Zod Tool Schemas ───────────────────────────────────────────────────

export const createCalendarEventSchema = z.object({
  title: z.string().describe("Title of the calendar event"),
  startTime: z.string().describe("Start time of the event in ISO 8601 string format (e.g. 2026-08-12T10:00:00.000Z)"),
  endTime: z.string().describe("End time of the event in ISO 8601 string format (e.g. 2026-08-12T11:00:00.000Z)"),
  timezone: z.string().optional().describe("IANA timezone identifier, e.g. UTC, America/New_York"),
  isAllDay: z.boolean().optional().describe("Whether this event is an all-day event"),
  description: z.string().optional().describe("Optional description or details for the event"),
  location: z.string().optional().describe("Location or link for the event"),
  recurrenceRule: z.string().optional().describe("Optional RRULE string, e.g. FREQ=WEEKLY;BYDAY=MO,WE"),
  reminderLeadMinutes: z.number().optional().describe("Optional reminder lead time in minutes before event start")
});

export const createHabitSchema = z.object({
  title: z.string().describe("Name/title of the habit to build"),
  frequency: z
    .object({
      type: z.enum(["daily", "weekly", "custom"]).default("daily"),
      daysOfWeek: z.array(z.number()).optional(),
      timesPerPeriod: z.number().optional()
    })
    .optional()
    .describe("Frequency configuration for the habit"),
  reminderTime: z.string().optional().describe("Optional daily reminder time in HH:mm format, e.g. 08:00"),
  reminderEnabled: z.boolean().optional().describe("Whether daily reminders are enabled")
});

export const createNoteSchema = z.object({
  title: z.string().optional().describe("Title of the note"),
  content: z.string().describe("Text content or body of the note"),
  folderId: z.string().optional().describe("Optional parent folder ID"),
  tags: z.array(z.string()).optional().describe("Optional tags for categorization")
});

export type CreateCalendarEventInput = z.infer<typeof createCalendarEventSchema>;
export type CreateHabitInput = z.infer<typeof createHabitSchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;

// ─── 2. Provider-Agnostic LangChain Tool Definitions ───────────────────────

export const createCalendarEventTool = tool(
  async (input) => JSON.stringify(input),
  {
    name: "create_calendar_event",
    description: "Schedule a new event or meeting on the user's calendar.",
    schema: createCalendarEventSchema
  }
);

export const createHabitTool = tool(
  async (input) => JSON.stringify(input),
  {
    name: "create_habit",
    description: "Create a new habit tracker for the user.",
    schema: createHabitSchema
  }
);

export const createNoteTool = tool(
  async (input) => JSON.stringify(input),
  {
    name: "create_note",
    description: "Create a new note or document in the user's notebook.",
    schema: createNoteSchema
  }
);

export const ALL_AI_TOOLS = [createCalendarEventTool, createHabitTool, createNoteTool];

// ─── 3. Shared Backend Execution Services (FR-2.14 Validation Parity) ───────

export async function executeCreateCalendarEvent(userId: string, args: CreateCalendarEventInput) {
  const startTime = new Date(args.startTime);
  const endTime = new Date(args.endTime);

  if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
    throw new Error("Invalid start or end date format provided.");
  }
  if (endTime <= startTime) {
    throw new Error("Event end time must be after start time.");
  }

  const timezone = args.timezone || "UTC";
  if (!isValidTimezone(timezone)) {
    throw new Error(`"${timezone}" is not a valid IANA timezone.`);
  }

  if (args.recurrenceRule) {
    validateRecurrenceRule(args.recurrenceRule, startTime, timezone);
  }

  const doc = await Event.create({
    userId,
    title: args.title,
    description: args.description || "",
    location: args.location || "",
    startTime,
    endTime,
    timezone,
    isAllDay: Boolean(args.isAllDay),
    recurrenceRule: args.recurrenceRule || null,
    reminderLeadMinutes: args.reminderLeadMinutes ?? null
  });

  if (!doc.recurrenceRule && doc.reminderLeadMinutes != null) {
    const jobId = await scheduleEventReminder(doc);
    if (jobId) {
      doc.reminderJobId = jobId;
      await doc.save();
    }
  }

  await enqueueEmbeddingJob("event", doc._id.toString(), userId);

  return {
    id: doc._id.toString(),
    title: doc.title,
    startTime: doc.startTime.toISOString(),
    endTime: doc.endTime.toISOString(),
    timezone: doc.timezone,
    location: doc.location,
    isAllDay: doc.isAllDay,
    message: `Calendar event "${doc.title}" scheduled successfully.`
  };
}

export async function executeCreateHabit(userId: string, args: CreateHabitInput) {
  if (!args.title || !args.title.trim()) {
    throw new Error("Habit title is required.");
  }

  const freqType = args.frequency?.type || "daily";
  const daysOfWeek = Array.isArray(args.frequency?.daysOfWeek) ? args.frequency.daysOfWeek : [];
  const timesPerPeriod = typeof args.frequency?.timesPerPeriod === "number" ? args.frequency.timesPerPeriod : 1;

  const doc = await Habit.create({
    userId,
    title: args.title.trim(),
    frequency: {
      type: freqType,
      daysOfWeek,
      timesPerPeriod
    },
    reminderTime: args.reminderTime || null,
    reminderEnabled: Boolean(args.reminderEnabled),
    currentStreak: 0,
    longestStreak: 0,
    completionRate: 0
  });

  await enqueueEmbeddingJob("habit", doc._id.toString(), userId);

  return {
    id: doc._id.toString(),
    title: doc.title,
    frequency: doc.frequency,
    message: `Habit "${doc.title}" created successfully.`
  };
}

export async function executeCreateNote(userId: string, args: CreateNoteInput) {
  if (args.folderId) {
    const folder = await NoteFolder.findOne({ _id: args.folderId, userId });
    if (!folder) {
      throw new Error("Specified folder does not exist or does not belong to user.");
    }
  }

  const textContent = args.content || "";
  const proseMirrorContent = {
    type: "doc",
    content: textContent
      ? [{ type: "paragraph", content: [{ type: "text", text: textContent }] }]
      : []
  };

  const contentText = extractContentText(proseMirrorContent);

  const doc = await Note.create({
    userId,
    title: args.title?.trim() || "Untitled Note",
    content: proseMirrorContent,
    contentText,
    folderId: args.folderId || null,
    tags: Array.isArray(args.tags) ? args.tags : []
  });

  await enqueueEmbeddingJob("note", doc._id.toString(), userId);

  return {
    id: doc._id.toString(),
    title: doc.title,
    contentText: doc.contentText,
    tags: doc.tags,
    message: `Note "${doc.title}" created successfully.`
  };
}

export async function executeToolCall(userId: string, toolName: string, args: any) {
  switch (toolName) {
    case "create_calendar_event":
      return await executeCreateCalendarEvent(userId, args);
    case "create_habit":
      return await executeCreateHabit(userId, args);
    case "create_note":
      return await executeCreateNote(userId, args);
    default:
      throw new Error(`Unknown tool name: ${toolName}`);
  }
}
