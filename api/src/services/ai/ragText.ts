import type { NoteDoc } from "../../models/Note.js";
import type { GoalDoc } from "../../models/Goal.js";
import type { HabitDoc } from "../../models/Habit.js";
import type { EventDoc } from "../../models/Event.js";
import type { SourceType } from "../../models/Embedding.js";

export interface FormattedSourceContent {
  title: string;
  embeddedText: string;
}

export function formatNoteForEmbedding(note: NoteDoc): FormattedSourceContent {
  const title = note.title?.trim() || "Untitled Note";
  const body = note.contentText?.trim() || "";
  const tagsText = note.tags && note.tags.length > 0 ? `\nTags: ${note.tags.join(", ")}` : "";
  const embeddedText = `Note: ${title}\n\n${body}${tagsText}`.trim();
  return { title, embeddedText };
}

export function formatGoalForEmbedding(goal: GoalDoc): FormattedSourceContent {
  const title = goal.title?.trim() || "Untitled Goal";
  const desc = goal.description?.trim() ? `\nDescription: ${goal.description.trim()}` : "";
  const target = goal.targetDate
    ? `\nTarget Date: ${new Date(goal.targetDate).toISOString().split("T")[0]}`
    : "";
  const milestones =
    goal.milestones && goal.milestones.length > 0
      ? `\nMilestones: ${goal.milestones.map((m) => (m.completed ? "[x] " : "[ ] ") + m.title).join("; ")}`
      : "";
  const embeddedText =
    `Goal: ${title}\nStatus: ${goal.status} (${goal.progressPercent}% complete)${desc}${target}${milestones}`.trim();
  return { title, embeddedText };
}

export function formatHabitForEmbedding(habit: HabitDoc): FormattedSourceContent {
  const title = habit.title?.trim() || "Untitled Habit";
  const freqType = habit.frequency?.type || "daily";
  const freqDesc =
    freqType === "weekly" && habit.frequency?.daysOfWeek
      ? `weekly on days [${habit.frequency.daysOfWeek.join(", ")}]`
      : freqType;
  const embeddedText =
    `Habit: ${title}\nFrequency: ${freqDesc}\nCurrent Streak: ${habit.currentStreak} days (Best: ${habit.longestStreak} days, Completion Rate: ${Math.round((habit.completionRate ?? 0) * 100)}%)`.trim();
  return { title, embeddedText };
}

export function formatEventForEmbedding(event: EventDoc): FormattedSourceContent {
  const title = event.title?.trim() || "Untitled Event";
  const desc = event.description?.trim() ? `\nDescription: ${event.description.trim()}` : "";
  const loc = event.location?.trim() ? `\nLocation: ${event.location.trim()}` : "";
  const timeStr =
    event.startTime && event.endTime
      ? `\nTime: ${new Date(event.startTime).toISOString()} to ${new Date(event.endTime).toISOString()} (${event.timezone})`
      : "";
  const embeddedText = `Event: ${title}${desc}${loc}${timeStr}`.trim();
  return { title, embeddedText };
}

export function formatSourceRecordForEmbedding(
  sourceType: SourceType,
  doc: any
): FormattedSourceContent {
  switch (sourceType) {
    case "note":
      return formatNoteForEmbedding(doc);
    case "goal":
      return formatGoalForEmbedding(doc);
    case "habit":
      return formatHabitForEmbedding(doc);
    case "event":
      return formatEventForEmbedding(doc);
    default:
      throw new Error(`Unsupported sourceType: ${sourceType}`);
  }
}
