import { User } from "../../models/User.js";
import { Habit } from "../../models/Habit.js";
import { HabitCheckIn } from "../../models/HabitCheckIn.js";
import { Event } from "../../models/Event.js";
import { Goal } from "../../models/Goal.js";
import { Summary, type SummaryDoc } from "../../models/Summary.js";
import { callAI } from "./callAI.js";
import {
  dateKeyInZone,
  utcMidnightForKey,
  expandRange,
  type CalendarEventLike
} from "../recurrence.js";
import { scheduleNotification } from "../notifications/scheduler.js";
import { logger } from "../../logger.js";

async function getOverridesMap(
  events: CalendarEventLike[]
): Promise<Map<string, CalendarEventLike>> {
  const ids = new Set<string>();
  for (const event of events) {
    for (const exception of event.exceptions || []) {
      if (exception.overrideEventId) ids.add(exception.overrideEventId.toString());
    }
  }
  if (ids.size === 0) return new Map();
  const docs = await Event.find({ _id: { $in: [...ids] } }).lean();
  return new Map(docs.map((d) => [d._id.toString(), d as unknown as CalendarEventLike]));
}

export function getYesterdayDateKey(todayDateKey: string): string {
  const [year, month, day] = todayDateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);
  return dateKeyInZone(date, "UTC");
}

export async function generateDailySummary(userId: string, dateStr: string): Promise<SummaryDoc> {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  const yesterdayKey = getYesterdayDateKey(dateStr);

  // 1. Yesterday's completed items
  const checkIns = await HabitCheckIn.find({ userId, date: yesterdayKey, completed: true }).lean();
  const habitIds = checkIns.map((c) => c.habitId);
  const habits = await Habit.find({ _id: { $in: habitIds } }).lean();
  const habitMap = new Map(habits.map((h) => [h._id.toString(), h.title]));

  const yesterdayCompleted: Array<{
    id?: string;
    title: string;
    type: string;
    completedAt?: Date;
  }> = checkIns.map((c) => ({
    id: c.habitId.toString(),
    title: habitMap.get(c.habitId.toString()) || "Completed Habit",
    type: "habit"
  }));

  // Check recently completed goals
  const completedGoals = await Goal.find({
    userId,
    status: "completed"
  })
    .limit(5)
    .lean();
  for (const goal of completedGoals) {
    yesterdayCompleted.push({
      id: goal._id.toString(),
      title: goal.title,
      type: "goal"
    });
  }

  // 2. Today's Schedule
  const startOfDay = utcMidnightForKey(dateStr);
  const endOfDay = new Date(startOfDay.getTime() + 86_400_000);

  const candidateEvents = await Event.find({
    userId,
    isOverride: { $ne: true },
    $or: [
      { recurrenceRule: null, startTime: { $lt: endOfDay }, endTime: { $gt: startOfDay } },
      {
        recurrenceRule: { $ne: null },
        startTime: { $lte: endOfDay },
        $or: [{ recurrenceEndDate: null }, { recurrenceEndDate: { $gte: startOfDay } }]
      }
    ]
  }).lean();

  const overridesMap = await getOverridesMap(candidateEvents as unknown as CalendarEventLike[]);
  const occurrences = expandRange(
    candidateEvents as unknown as CalendarEventLike[],
    startOfDay,
    endOfDay,
    overridesMap
  );

  const todaySchedule = occurrences.map((occ) => ({
    occurrenceId: occ.occurrenceId,
    title: occ.title,
    startTime: occ.startTime,
    endTime: occ.endTime,
    location: occ.location || "",
    isAllDay: occ.isAllDay || false
  }));

  // 3. Top 3 Priorities via callAI()
  const activeGoals = await Goal.find({ userId, status: "active" })
    .select("title description targetDate")
    .limit(10)
    .lean();

  const systemMessage = {
    role: "system" as const,
    content: `You are LifeOS AI Assistant. Analyze the user's completed accomplishments from yesterday, today's schedule, and active goals to identify and rank the top 3 priorities for today.
Output strictly valid JSON with no extra commentary in this exact format:
{
  "priorities": [
    { "title": "Priority 1 title", "category": "goal|schedule|habit|general", "rationale": "Brief rationale" },
    { "title": "Priority 2 title", "category": "goal|schedule|habit|general", "rationale": "Brief rationale" },
    { "title": "Priority 3 title", "category": "goal|schedule|habit|general", "rationale": "Brief rationale" }
  ]
}`
  };

  const userContent = JSON.stringify({
    date: dateStr,
    yesterdayCompleted,
    todaySchedule,
    activeGoals: activeGoals.map((g) => ({ title: g.title, targetDate: g.targetDate }))
  });

  const aiRes = await callAI([systemMessage, { role: "user", content: userContent }], {
    userId,
    requestType: "daily_summary",
    isAsyncContext: true,
    temperature: 0.3
  });

  if (!aiRes.success || !aiRes.content) {
    throw new Error(
      `callAI failed during daily summary generation: ${aiRes.error || "No content served"}`
    );
  }

  let topPriorities: Array<{ title: string; category?: string; rationale?: string }> = [];

  try {
    const rawContent = aiRes.content.trim();
    const jsonStr = rawContent.startsWith("```")
      ? rawContent
          .replace(/^```(?:json)?\n?/, "")
          .replace(/\n?```$/, "")
          .trim()
      : rawContent;
    const parsed = JSON.parse(jsonStr);

    if (Array.isArray(parsed.priorities)) {
      topPriorities = parsed.priorities.slice(0, 3).map((p: any) => ({
        title: String(p.title || ""),
        category: String(p.category || "general"),
        rationale: String(p.rationale || "")
      }));
    }
  } catch (parseErr) {
    logger.warn(
      { parseErr, content: aiRes.content },
      "Failed to parse AI response for priorities, using fallback text parsing"
    );
  }

  if (topPriorities.length === 0) {
    // Fallback top priorities from schedule/goals
    if (todaySchedule.length > 0) {
      topPriorities.push({
        title: `Attend ${todaySchedule[0].title}`,
        category: "schedule",
        rationale: "Scheduled event today"
      });
    }
    if (activeGoals.length > 0) {
      topPriorities.push({
        title: `Make progress on ${activeGoals[0].title}`,
        category: "goal",
        rationale: "Active user goal"
      });
    }
    if (topPriorities.length < 3) {
      topPriorities.push({
        title: "Review daily habits and routine",
        category: "habit",
        rationale: "Maintain daily streak"
      });
    }
  }

  // 4. Save Summary document (Upsert)
  const summaryDoc = await Summary.findOneAndUpdate(
    { userId, date: dateStr },
    {
      $set: {
        yesterdayCompleted,
        todaySchedule,
        topPriorities,
        generatedAt: new Date()
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // 5. Delivery via Phase 2 notification engine
  const channels = user.notificationPreferences?.dailySummary?.channels || ["push", "in_app"];
  const topPriorityText = topPriorities[0]?.title || "Check your top priorities for today.";

  for (const ch of channels) {
    if (ch === "push" || ch === "in_app" || ch === "email") {
      await scheduleNotification({
        userId,
        type: "daily_summary",
        channel: ch as any,
        title: `Daily Summary - ${dateStr}`,
        body: `Top Priority: ${topPriorityText}`,
        data: {
          summaryDate: dateStr,
          deepLink: `/summary/${dateStr}`
        },
        scheduledFor: new Date()
      });
    }
  }

  logger.info(
    { userId, date: dateStr, summaryId: summaryDoc._id.toString() },
    "Daily summary generated and enqueued for delivery"
  );
  return summaryDoc;
}
