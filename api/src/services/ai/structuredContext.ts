import mongoose from "mongoose";
import { Event } from "../../models/Event.js";
import { Habit } from "../../models/Habit.js";
import { HabitCheckIn } from "../../models/HabitCheckIn.js";
import { Goal } from "../../models/Goal.js";
import { Note } from "../../models/Note.js";
import { Transaction } from "../../models/Transaction.js";
import { Budget } from "../../models/Budget.js";
import { User } from "../../models/User.js";
import { expandRange } from "../recurrence.js";
import { collectOverrides, overlapWindowQuery } from "../../routes/calendar.js";
import { logger } from "../../logger.js";

export interface StructuredContextOptions {
  referenceDate?: Date;
  timezone?: string;
}

export interface ModuleCounts {
  eventsCount: number;
  habitsCount: number;
  pendingHabitsCount: number;
  completedHabitsCount: number;
  goalsCount: number;
  transactionsCount: number;
  budgetsCount: number;
  notesCount: number;
}

export interface StructuredContextResult {
  formattedContext: string;
  hasAnyData: boolean;
  counts: ModuleCounts;
  dateStr: string;
  timezone: string;
}

/**
 * Helper to compute start and end of day in a specific IANA timezone (or UTC).
 */
export function getDayBoundaries(refDate: Date, timezone: string): { startOfDay: Date; endOfDay: Date; dateStr: string } {
  // Format YYYY-MM-DD in the target timezone
  let dateStr = "";
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    dateStr = formatter.format(refDate); // YYYY-MM-DD
  } catch {
    dateStr = refDate.toISOString().split("T")[0];
  }

  // Construct start and end dates
  const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
  const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

  return { startOfDay, endOfDay, dateStr };
}

export function formatSchedule(occurrences: any[], _timezone?: string): string {
  if (!occurrences || occurrences.length === 0) {
    return "• No calendar events scheduled for today.";
  }
  return occurrences
    .map((occ) => {
      const startStr = new Date(occ.startTime || occ.start).toISOString().substring(11, 16);
      const endStr = new Date(occ.endTime || occ.end).toISOString().substring(11, 16);
      const loc = occ.location ? ` @ ${occ.location}` : "";
      const desc = occ.description ? ` (${occ.description.substring(0, 60)})` : "";
      return `• [${startStr} - ${endStr}] ${occ.title}${loc}${desc}`;
    })
    .join("\n");
}

export function formatHabitsWithStatus(
  habits: any[],
  completedHabitIds: Set<string>,
  _dateStr?: string
): string {
  if (!habits || habits.length === 0) {
    return "• No active habits tracked in account.";
  }
  return habits
    .map((h) => {
      const isCompleted = completedHabitIds.has(h._id?.toString());
      const statusTag = isCompleted ? "[COMPLETED TODAY]" : "[PENDING - NOT COMPLETED TODAY]";
      const freq = h.frequency?.type ? h.frequency.type.charAt(0).toUpperCase() + h.frequency.type.slice(1) : "Daily";
      const cat = h.category ? `, ${h.category}` : "";
      const streakInfo = `Streak: ${h.currentStreak || 0} days`;
      const reminder = h.reminderEnabled && h.reminderTime ? `, Reminder: ${h.reminderTime}` : "";
      return `• ${h.title} (${freq}${cat}): ${statusTag} ${streakInfo}${reminder}`;
    })
    .join("\n");
}

export function formatGoals(goals: any[]): string {
  if (!goals || goals.length === 0) return "";
  return goals
    .map((g) => {
      const target = g.targetDate ? `Target: ${new Date(g.targetDate).toISOString().split("T")[0]}` : "No deadline";
      const progress = `${g.progressPercent || 0}% complete`;
      return `• ${g.title} (Status: ${g.status}, ${progress}, ${target})`;
    })
    .join("\n");
}

export function formatFinanceSummary(
  budgets: any[],
  recentTx: any[] = []
): string {
  const financeLines: string[] = [];
  if (budgets && budgets.length > 0) {
    financeLines.push("Monthly Budgets:");
    for (const b of budgets) {
      const limit = b.limit || b.limitAmount || 0;
      const spent = b.currentSpend || b.spentAmount || 0;
      const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
      const overspend = spent > limit ? " [OVER BUDGET]" : "";
      const curr = b.currency ? ` ${b.currency}` : "";
      financeLines.push(`  • ${b.category}: ${spent} / ${limit}${curr} spent (${pct}%)${overspend}`);
    }
  }

  if (recentTx && recentTx.length > 0) {
    if (financeLines.length > 0) financeLines.push("Recent Transactions:");
    for (const tx of recentTx) {
      const sign = tx.type === "expense" ? "-" : "+";
      const dStr = tx.date ? new Date(tx.date).toISOString().split("T")[0] : "";
      const note = tx.note ? ` ("${tx.note.substring(0, 30)}")` : "";
      financeLines.push(`  • ${dStr}: ${sign}$${tx.amount} [${tx.category}]${note}`);
    }
  }

  return financeLines.join("\n");
}

export function formatRecentNotes(notes: any[]): string {
  if (!notes || notes.length === 0) return "";
  return notes
    .map((n) => {
      const title = n.title || "Untitled Note";
      const updated = n.updatedAt ? new Date(n.updatedAt).toISOString().split("T")[0] : "";
      const tags = n.tags && n.tags.length > 0 ? ` [tags: ${n.tags.join(", ")}]` : "";
      const snippet = n.contentText ? ` - "${n.contentText.substring(0, 80).replace(/\s+/g, " ").trim()}"` : "";
      return `• "${title}" (updated ${updated})${tags}${snippet}`;
    })
    .join("\n");
}

/**
 * Builds deterministic, structured user context from MongoDB collections
 * for date-scoped, habit, schedule, finance, and note queries.
 *
 * Guarantees strict user isolation by querying with `{ userId: userObjectId }`.
 */
export async function getStructuredContext(
  userId: string | mongoose.Types.ObjectId,
  options: StructuredContextOptions = {}
): Promise<StructuredContextResult> {
  const userIdStr = userId.toString();
  const userObjectId = new mongoose.Types.ObjectId(userIdStr);

  const refDate = options.referenceDate || new Date();

  // 1. Resolve user timezone preference if available
  let tzid = options.timezone || "UTC";
  try {
    const user = await User.findById(userObjectId)
      .select("notificationPreferences")
      .lean();
    if (user?.notificationPreferences?.dailySummary?.timezone) {
      tzid = user.notificationPreferences.dailySummary.timezone;
    }
  } catch (err: any) {
    logger.debug({ err: err.message, userId: userIdStr }, "Could not load user timezone preference");
  }

  const { startOfDay, endOfDay, dateStr } = getDayBoundaries(refDate, tzid);

  const counts: ModuleCounts = {
    eventsCount: 0,
    habitsCount: 0,
    pendingHabitsCount: 0,
    completedHabitsCount: 0,
    goalsCount: 0,
    transactionsCount: 0,
    budgetsCount: 0,
    notesCount: 0
  };

  const sections: string[] = [];

  // ─── 2. Today's Schedule (Calendar Events & Recurrences) ───────────────────
  try {
    const events = await Event.find(overlapWindowQuery(userObjectId, startOfDay, endOfDay));
    const overrides = await collectOverrides(events);
    const occurrences = expandRange(events as any, startOfDay, endOfDay, overrides as any);

    // Filter occurrences that actually touch today's boundary and sort chronologically
    const todaysOccurrences = occurrences
      .filter((occ) => {
        const occStart = new Date(occ.startTime);
        const occEnd = new Date(occ.endTime);
        return occStart <= endOfDay && occEnd >= startOfDay;
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    counts.eventsCount = todaysOccurrences.length;
    sections.push(`=== TODAY'S SCHEDULE (${dateStr}) ===\n${formatSchedule(todaysOccurrences, tzid)}`);
  } catch (err: any) {
    logger.warn({ err: err.message, userId: userIdStr }, "Error fetching structured schedule context");
    sections.push(`=== TODAY'S SCHEDULE (${dateStr}) ===\n• Schedule data temporarily unavailable.`);
  }

  // ─── 3. Habits & Today's Check-in Completion Status ────────────────────────
  try {
    const habits = await Habit.find({ userId: userObjectId }).sort({ title: 1 }).lean();
    counts.habitsCount = habits.length;

    if (habits.length > 0) {
      const checkIns = await HabitCheckIn.find({
        userId: userObjectId,
        date: dateStr
      }).lean();

      const completedIds = new Set<string>();
      for (const ci of checkIns) {
        if (ci.completed) completedIds.add(ci.habitId.toString());
      }

      for (const h of habits) {
        if (completedIds.has(h._id.toString())) {
          counts.completedHabitsCount++;
        } else {
          counts.pendingHabitsCount++;
        }
      }

      sections.push(`=== HABITS & TODAY'S COMPLETION STATUS (${dateStr}) ===\n${formatHabitsWithStatus(habits, completedIds, dateStr)}`);
    } else {
      sections.push(`=== HABITS & TODAY'S COMPLETION STATUS (${dateStr}) ===\n• No active habits tracked in account.`);
    }
  } catch (err: any) {
    logger.warn({ err: err.message, userId: userIdStr }, "Error fetching structured habits context");
    sections.push(`=== HABITS & TODAY'S COMPLETION STATUS (${dateStr}) ===\n• Habit data temporarily unavailable.`);
  }

  // ─── 4. Active Goals in Progress ───────────────────────────────────────────
  try {
    const goals = await Goal.find({ userId: userObjectId, status: { $ne: "completed" } })
      .sort({ targetDate: 1 })
      .limit(5)
      .lean();
    counts.goalsCount = goals.length;

    if (goals.length > 0) {
      sections.push(`=== ACTIVE GOALS ===\n${formatGoals(goals)}`);
    }
  } catch (err: any) {
    logger.warn({ err: err.message, userId: userIdStr }, "Error fetching structured goals context");
  }

  // ─── 5. Budgets & Recent Financial Transactions ────────────────────────────
  try {
    const budgets = await Budget.find({ userId: userObjectId, period: "monthly" }).lean();
    counts.budgetsCount = budgets.length;

    const recentTx = await Transaction.find({ userId: userObjectId })
      .sort({ date: -1 })
      .limit(8)
      .lean();
    counts.transactionsCount = recentTx.length;

    const financeStr = formatFinanceSummary(budgets, recentTx);
    if (financeStr) {
      sections.push(`=== RECENT SPENDING & BUDGET STATUS ===\n${financeStr}`);
    }
  } catch (err: any) {
    logger.warn({ err: err.message, userId: userIdStr }, "Error fetching structured finance context");
  }

  // ─── 6. Recent Notes ───────────────────────────────────────────────────────
  try {
    const notes = await Note.find({ userId: userObjectId })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select("title contentText tags updatedAt")
      .lean();
    counts.notesCount = notes.length;

    if (notes.length > 0) {
      sections.push(`=== RECENT NOTES ===\n${formatRecentNotes(notes)}`);
    }
  } catch (err: any) {
    logger.warn({ err: err.message, userId: userIdStr }, "Error fetching structured notes context");
  }

  const hasAnyData =
    counts.eventsCount > 0 ||
    counts.habitsCount > 0 ||
    counts.goalsCount > 0 ||
    counts.transactionsCount > 0 ||
    counts.budgetsCount > 0 ||
    counts.notesCount > 0;

  const formattedContext = sections.join("\n\n");

  return {
    formattedContext,
    hasAnyData,
    counts,
    dateStr,
    timezone: tzid
  };
}
