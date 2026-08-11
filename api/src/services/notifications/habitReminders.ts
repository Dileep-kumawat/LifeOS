import { Habit } from "../../models/Habit.js";
import { HabitCheckIn } from "../../models/HabitCheckIn.js";
import { User } from "../../models/User.js";
import { scheduleNotification } from "./scheduler.js";
import { isPreferenceEnabled } from "./preferences.js";
import { formatDateString } from "../streak.js";
import { logger } from "../../logger.js";

/**
 * Periodically executed process (e.g. hourly) that finds active habits with matching
 * `reminderTime`, skips habits already checked in today, checks the user's notification preferences,
 * and calls `scheduleNotification`. Multiple habits due at the same time for one user collapse
 * into a single notification via `scheduleNotification`'s dedupe/batching mechanism.
 */
export async function processHabitReminders(
  targetHourStr?: string,
  targetDateStr?: string
): Promise<{ scheduledUsers: number; totalHabitsReminded: number }> {
  const now = new Date();
  const hourStr = targetHourStr ?? `${String(now.getHours()).padStart(2, "0")}:00`;
  const dateStr = targetDateStr ?? formatDateString(now);

  // Find habits enabled for this reminder time
  const habits = await Habit.find({
    reminderEnabled: true,
    reminderTime: hourStr
  });

  if (habits.length === 0) {
    return { scheduledUsers: 0, totalHabitsReminded: 0 };
  }

  // Group habits by user
  const habitsByUser = new Map<string, typeof habits>();
  for (const habit of habits) {
    const uId = habit.userId.toString();
    const list = habitsByUser.get(uId) ?? [];
    list.push(habit);
    habitsByUser.set(uId, list);
  }

  let scheduledUsers = 0;
  let totalHabitsReminded = 0;

  for (const [userId, userHabits] of habitsByUser.entries()) {
    const user = await User.findById(userId);
    if (!user || user.status !== "active") continue;

    // Preference check: check global habitReminders preference before scheduling
    if (!isPreferenceEnabled(user.notificationPreferences ?? undefined, "habitReminders", "push")) {
      logger.info(
        { userId, hourStr },
        "skipping habit reminders — user disabled habitReminders preference"
      );
      continue;
    }

    const habitIds = userHabits.map((h) => h._id);

    // Query check-ins for today
    const checkIns = await HabitCheckIn.find({
      userId,
      habitId: { $in: habitIds },
      date: dateStr,
      completed: true
    }).select("habitId");

    const checkedInHabitIds = new Set(checkIns.map((c) => c.habitId.toString()));

    // Filter out habits already checked in today
    const pendingHabits = userHabits.filter((h) => !checkedInHabitIds.has(h._id.toString()));

    if (pendingHabits.length === 0) continue;

    scheduledUsers++;

    for (const habit of pendingHabits) {
      totalHabitsReminded++;
      await scheduleNotification({
        userId,
        type: "habit_reminder",
        channel: "push",
        title: `Habit Reminder: ${habit.title}`,
        body: `Time to check in on "${habit.title}"!`,
        data: { habitId: habit._id.toString() },
        scheduledFor: now
      });
    }
  }

  return { scheduledUsers, totalHabitsReminded };
}
