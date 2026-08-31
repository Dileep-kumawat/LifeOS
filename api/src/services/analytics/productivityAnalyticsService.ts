import { Types } from "mongoose";
import { Habit } from "../../models/Habit.js";
import { HabitCheckIn } from "../../models/HabitCheckIn.js";
import { getFocusSummaryData } from "../focus/focusAggregation.js";
import type {
  ProductivityAnalytics,
  HabitConsistencyStat,
  ProductivityDailyTrendItem
} from "@lifeos/shared";

/**
 * Normalizes start and end date strings into UTC Date boundaries.
 */
export function normalizeDateBounds(
  startDateStr: string,
  endDateStr: string
): {
  startBound: Date;
  endBound: Date;
  startDateIso: string;
  endDateIso: string;
  totalDays: number;
} {
  const startPart = startDateStr.split("T")[0];
  const endPart = endDateStr.split("T")[0];

  const [y1, m1, d1] = startPart.split("-").map(Number);
  const [y2, m2, d2] = endPart.split("-").map(Number);

  const startBound = new Date(Date.UTC(y1, m1 - 1, d1, 0, 0, 0, 0));
  const endBound = new Date(Date.UTC(y2, m2 - 1, d2, 23, 59, 59, 999));

  const diffMs = endBound.getTime() - startBound.getTime();
  const totalDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));

  return {
    startBound,
    endBound,
    startDateIso: startPart,
    endDateIso: endPart,
    totalDays
  };
}

/**
 * Calculates how many times a habit was expected to be completed within a date range.
 */
export function calculateExpectedHabitCount(
  frequency: {
    type: "daily" | "weekly" | "custom";
    daysOfWeek?: number[];
    timesPerPeriod?: number;
  },
  startDateStr: string,
  endDateStr: string
): { expectedCount: number; expectedDates: Set<string> } {
  const startPart = startDateStr.split("T")[0];
  const endPart = endDateStr.split("T")[0];
  const [y1, m1, d1] = startPart.split("-").map(Number);
  const [y2, m2, d2] = endPart.split("-").map(Number);

  const cursor = new Date(Date.UTC(y1, m1 - 1, d1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y2, m2 - 1, d2, 0, 0, 0, 0));

  const allDates: string[] = [];
  const expectedDates = new Set<string>();

  while (cursor <= end) {
    const dStr = cursor.toISOString().split("T")[0];
    allDates.push(dStr);
    const dayOfWeek = cursor.getUTCDay(); // 0 = Sunday, 6 = Saturday

    if (frequency.type === "daily") {
      expectedDates.add(dStr);
    } else if (
      frequency.type === "weekly" &&
      Array.isArray(frequency.daysOfWeek) &&
      frequency.daysOfWeek.length > 0
    ) {
      if (frequency.daysOfWeek.includes(dayOfWeek)) {
        expectedDates.add(dStr);
      }
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  let expectedCount = 0;
  if (frequency.type === "daily") {
    expectedCount = allDates.length;
  } else if (
    frequency.type === "weekly" &&
    Array.isArray(frequency.daysOfWeek) &&
    frequency.daysOfWeek.length > 0
  ) {
    expectedCount = expectedDates.size;
  } else if (frequency.type === "weekly") {
    // Weekly without specific days -> times per week = 1
    expectedCount = Math.ceil((allDates.length / 7) * 1);
  } else {
    // Custom frequency: timesPerPeriod per week
    const times = frequency.timesPerPeriod || 1;
    expectedCount = Math.ceil((allDates.length / 7) * times);
  }

  return { expectedCount, expectedDates };
}

/**
 * Aggregates productivity metrics (habits completion rates, focus sessions, habit consistency, and daily trend)
 * over a given date range.
 */
export async function getProductivityAnalytics(
  userId: string | Types.ObjectId,
  startDateStr: string,
  endDateStr: string
): Promise<ProductivityAnalytics> {
  const userObjId = typeof userId === "string" ? new Types.ObjectId(userId) : userId;
  const { startBound, endBound, startDateIso, endDateIso, totalDays } = normalizeDateBounds(
    startDateStr,
    endDateStr
  );

  // 1. Fetch habits and check-ins
  const [habits, checkIns, focusData] = await Promise.all([
    Habit.find({ userId: userObjId }).lean(),
    HabitCheckIn.find({
      userId: userObjId,
      date: { $gte: startDateIso, $lte: endDateIso }
    }).lean(),
    getFocusSummaryData(userObjId, startBound, endBound)
  ]);

  // Index check-ins: map of habitId -> array of completed dates
  const checkInsByHabit = new Map<string, Set<string>>();
  // Map of date -> completed count across all habits
  const dailyCompletedCheckIns = new Map<string, number>();

  for (const c of checkIns) {
    if (c.completed) {
      const hId = c.habitId.toString();
      if (!checkInsByHabit.has(hId)) {
        checkInsByHabit.set(hId, new Set());
      }
      checkInsByHabit.get(hId)!.add(c.date);

      dailyCompletedCheckIns.set(c.date, (dailyCompletedCheckIns.get(c.date) || 0) + 1);
    }
  }

  // Daily expected counts map for trend
  const dailyExpectedCheckIns = new Map<string, number>();

  let totalExpectedHabits = 0;
  let totalCompletedHabits = 0;
  const habitConsistency: HabitConsistencyStat[] = [];

  for (const habit of habits) {
    const hId = habit._id.toString();
    const completedSet = checkInsByHabit.get(hId) || new Set();
    const { expectedCount, expectedDates } = calculateExpectedHabitCount(
      habit.frequency as any,
      startDateIso,
      endDateIso
    );

    // Track daily expected check-in occurrences
    for (const dStr of expectedDates) {
      dailyExpectedCheckIns.set(dStr, (dailyExpectedCheckIns.get(dStr) || 0) + 1);
    }

    const rangeCompleted = completedSet.size;
    const rangeCompletionRate =
      expectedCount > 0
        ? Math.min(1.0, Math.round((rangeCompleted / expectedCount) * 100) / 100)
        : 0;

    totalExpectedHabits += expectedCount;
    totalCompletedHabits += rangeCompleted;

    habitConsistency.push({
      habitId: hId,
      title: habit.title,
      frequency: habit.frequency as any,
      currentStreak: habit.currentStreak || 0,
      longestStreak: habit.longestStreak || 0,
      rangeExpected: expectedCount,
      rangeCompleted,
      rangeCompletionRate,
      lastCheckInDate: habit.lastCheckInDate || null
    });
  }

  const overallHabitCompletionRate =
    totalExpectedHabits > 0
      ? Math.min(1.0, Math.round((totalCompletedHabits / totalExpectedHabits) * 100) / 100)
      : 0;

  // 2. Build unified daily trend
  const focusTrendMap = new Map(
    focusData.trend.map((t) => [
      t.date,
      {
        focusMinutes: t.totalMinutes,
        completedSessions: t.completedCount,
        abandonedSessions: t.abandonedCount
      }
    ])
  );

  const trend: ProductivityDailyTrendItem[] = [];
  const cursor = new Date(startBound);
  const end = new Date(endBound);

  while (cursor <= end) {
    const dStr = cursor.toISOString().split("T")[0];
    const focusItem = focusTrendMap.get(dStr) || {
      focusMinutes: 0,
      completedSessions: 0,
      abandonedSessions: 0
    };

    trend.push({
      date: dStr,
      focusMinutes: focusItem.focusMinutes,
      completedSessions: focusItem.completedSessions,
      abandonedSessions: focusItem.abandonedSessions,
      habitsCompleted: dailyCompletedCheckIns.get(dStr) || 0,
      habitsExpected: dailyExpectedCheckIns.get(dStr) || 0
    });

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return {
    period: {
      startDate: startDateIso,
      endDate: endDateIso,
      totalDays
    },
    habits: {
      totalExpected: totalExpectedHabits,
      totalCompleted: totalCompletedHabits,
      completionRate: overallHabitCompletionRate
    },
    focus: {
      totalFocusMinutes: focusData.totalFocusMinutes,
      totalSessionsCount: focusData.totalSessionsCount,
      completedSessionsCount: focusData.completedSessionsCount,
      abandonedSessionsCount: focusData.abandonedSessionsCount,
      activeSessionsCount: focusData.activeSessionsCount,
      averageSessionMinutes: focusData.averageSessionMinutes,
      linkedTypeBreakdown: focusData.linkedTypeBreakdown
    },
    habitConsistency,
    trend
  };
}
