import { localRepo } from "./localRepo";
import { getDatabase } from "../database";
import type { LocalHabit, LocalHabitCheckIn } from "../schema";

export function computeHabitStreaks(
  checkInDates: string[],
  todayDateStr: string = new Date().toISOString().split("T")[0]
): { currentStreak: number; longestStreak: number; completionRate: number } {
  if (!checkInDates.length) {
    return { currentStreak: 0, longestStreak: 0, completionRate: 0 };
  }

  // Sort unique dates descending
  const uniqueDates = Array.from(new Set(checkInDates)).sort().reverse();
  const dateSet = new Set(uniqueDates);

  // Helper to get formatted YYYY-MM-DD for date offset
  const getOffsetDate = (base: Date, daysOffset: number) => {
    const d = new Date(base);
    d.setDate(d.getDate() + daysOffset);
    return d.toISOString().split("T")[0];
  };

  const today = new Date(todayDateStr);
  const yesterdayStr = getOffsetDate(today, -1);

  // Check if active today or yesterday
  let currentStreak = 0;
  let cursor = dateSet.has(todayDateStr)
    ? todayDateStr
    : dateSet.has(yesterdayStr)
      ? yesterdayStr
      : null;

  if (cursor) {
    let currDate = new Date(cursor);
    while (dateSet.has(currDate.toISOString().split("T")[0])) {
      currentStreak++;
      currDate.setDate(currDate.getDate() - 1);
    }
  }

  // Longest streak
  const chronological = Array.from(dateSet).sort();
  let longestStreak = 0;
  let tempStreak = 0;
  let prevDate: Date | null = null;

  for (const dateStr of chronological) {
    const d = new Date(dateStr);
    if (!prevDate) {
      tempStreak = 1;
    } else {
      const diffDays = Math.round((d.getTime() - prevDate.getTime()) / 86400000);
      if (diffDays === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    }
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }
    prevDate = d;
  }

  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
  }

  // Completion rate over last 30 days
  let last30DaysCount = 0;
  for (let i = 0; i < 30; i++) {
    const dStr = getOffsetDate(today, -i);
    if (dateSet.has(dStr)) {
      last30DaysCount++;
    }
  }
  const completionRate = Math.round((last30DaysCount / 30) * 100) / 100;

  return { currentStreak, longestStreak, completionRate };
}

export const habitRepo = {
  async createHabit(
    habit: Omit<LocalHabit, "id" | "syncStatus" | "lastModifiedAt" | "createdAt" | "updatedAt"> & {
      id?: string;
    }
  ): Promise<LocalHabit> {
    return localRepo.insert("habits", habit) as Promise<LocalHabit>;
  },

  async updateHabit(id: string, updates: Partial<LocalHabit>): Promise<boolean> {
    return localRepo.update("habits", id, updates);
  },

  async deleteHabit(id: string): Promise<boolean> {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM habit_check_ins WHERE habitId = ?;", id);
    return localRepo.delete("habits", id);
  },

  async getHabitById(id: string): Promise<LocalHabit | null> {
    const db = await getDatabase();
    return db.getFirstAsync<LocalHabit>("SELECT * FROM habits WHERE id = ?;", id);
  },

  async listHabits(userId: string): Promise<LocalHabit[]> {
    const db = await getDatabase();
    return db.getAllAsync<LocalHabit>(
      "SELECT * FROM habits WHERE userId = ? ORDER BY createdAt DESC;",
      userId
    );
  },

  async recordCheckIn(
    checkIn: Omit<
      LocalHabitCheckIn,
      "id" | "syncStatus" | "lastModifiedAt" | "createdAt" | "updatedAt"
    > & { id?: string }
  ): Promise<LocalHabitCheckIn> {
    return localRepo.insert("habit_check_ins", checkIn) as Promise<LocalHabitCheckIn>;
  },

  async getCheckIns(habitId: string): Promise<LocalHabitCheckIn[]> {
    const db = await getDatabase();
    return db.getAllAsync<LocalHabitCheckIn>(
      "SELECT * FROM habit_check_ins WHERE habitId = ? ORDER BY date DESC;",
      habitId
    );
  },

  async getCheckInsForUser(userId: string): Promise<LocalHabitCheckIn[]> {
    const db = await getDatabase();
    return db.getAllAsync<LocalHabitCheckIn>(
      "SELECT * FROM habit_check_ins WHERE userId = ? ORDER BY date DESC;",
      userId
    );
  },

  async getCheckInsForDate(userId: string, date: string): Promise<LocalHabitCheckIn[]> {
    const db = await getDatabase();
    return db.getAllAsync<LocalHabitCheckIn>(
      "SELECT * FROM habit_check_ins WHERE userId = ? AND date = ?;",
      userId,
      date
    );
  },

  async toggleCheckIn(
    habitId: string,
    userId: string,
    date: string = new Date().toISOString().split("T")[0]
  ): Promise<{ habit: LocalHabit | null; isCheckedIn: boolean; checkIn?: LocalHabitCheckIn }> {
    const db = await getDatabase();
    const existingCheckIn = await db.getFirstAsync<LocalHabitCheckIn>(
      "SELECT * FROM habit_check_ins WHERE habitId = ? AND date = ?;",
      habitId,
      date
    );

    let isCheckedIn = false;
    let checkInResult: LocalHabitCheckIn | undefined;

    if (existingCheckIn) {
      // Remove check-in
      await localRepo.delete("habit_check_ins", existingCheckIn.id);
      isCheckedIn = false;
    } else {
      // Insert check-in
      checkInResult = await this.recordCheckIn({
        habitId,
        userId,
        date,
        completed: 1
      });
      isCheckedIn = true;
    }

    // Recompute streak stats
    const allCheckIns = await this.getCheckIns(habitId);
    const dates = allCheckIns.map((c) => c.date);
    const { currentStreak, longestStreak, completionRate } = computeHabitStreaks(dates, date);

    const latestDate = dates.length ? dates.sort().reverse()[0] : null;

    await this.updateHabit(habitId, {
      currentStreak,
      longestStreak,
      completionRate,
      lastCheckInDate: latestDate
    });

    const updatedHabit = await this.getHabitById(habitId);
    return { habit: updatedHabit, isCheckedIn, checkIn: checkInResult };
  }
};
