export interface StreakCheckIn {
  date: string; // YYYY-MM-DD
  completed: boolean;
}

export interface FrequencyConfig {
  type: "daily" | "weekly" | "custom";
  daysOfWeek?: number[];
  timesPerPeriod?: number;
}

export interface CalculatedStats {
  currentStreak: number;
  longestStreak: number;
  completionRate: number;
  lastCheckInDate: string | null;
}

/**
 * Normalizes a JS Date or date string to YYYY-MM-DD in UTC/local calendar day.
 */
export function formatDateString(date: Date | string): string {
  if (typeof date === "string") {
    // If it's already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    const d = new Date(date);
    return d.toISOString().split("T")[0];
  }
  return date.toISOString().split("T")[0];
}

/**
 * Adds or subtracts days from a YYYY-MM-DD date string.
 */
export function addDaysStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split("T")[0];
}

/**
 * Returns the Monday start date string ("YYYY-MM-DD") for the week containing `dateStr`.
 */
export function getWeekStartStr(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const day = date.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diff = day === 0 ? -6 : 1 - day; // Adjust to Monday
  date.setUTCDate(date.getUTCDate() + diff);
  return date.toISOString().split("T")[0];
}

/**
 * Calculates updated streak stats (currentStreak, longestStreak, completionRate, lastCheckInDate)
 * given a list of check-ins, frequency configuration, existing longestStreak, and reference date (today).
 */
export function calculateHabitStats(
  checkIns: StreakCheckIn[],
  frequency: FrequencyConfig,
  existingLongestStreak: number = 0,
  refDateStr: string = formatDateString(new Date())
): CalculatedStats {
  // Sort check-ins ascending by date
  const sortedCheckIns = [...checkIns].sort((a, b) => a.date.localeCompare(b.date));

  // Map of date -> completed
  const checkInMap = new Map<string, boolean>();
  let lastCompletedDate: string | null = null;

  for (const c of sortedCheckIns) {
    checkInMap.set(c.date, c.completed);
    if (c.completed) {
      lastCompletedDate = c.date;
    }
  }

  let currentStreak = 0;

  if (frequency.type === "daily") {
    // Daily habit streak computation
    let startDate: string | null = null;

    if (checkInMap.get(refDateStr) === true) {
      startDate = refDateStr;
    } else if (checkInMap.get(refDateStr) === false) {
      // Explicitly marked false today -> streak broken
      startDate = null;
    } else {
      // Today not yet checked in -> check yesterday
      const yesterday = addDaysStr(refDateStr, -1);
      if (checkInMap.get(yesterday) === true) {
        startDate = yesterday;
      }
    }

    if (startDate) {
      let curr = startDate;
      while (checkInMap.get(curr) === true) {
        currentStreak++;
        curr = addDaysStr(curr, -1);
      }
    }
  } else {
    // Weekly or Custom habit streak computation (measured in period units / weeks)
    const expectedQuota =
      frequency.type === "weekly"
        ? frequency.daysOfWeek && frequency.daysOfWeek.length > 0
          ? frequency.daysOfWeek.length
          : 1
        : frequency.timesPerPeriod || 1;

    // Group completed check-ins by week start date (Monday)
    const weekCompletedCounts = new Map<string, number>();

    for (const c of sortedCheckIns) {
      if (c.completed) {
        const weekStart = getWeekStartStr(c.date);
        weekCompletedCounts.set(weekStart, (weekCompletedCounts.get(weekStart) || 0) + 1);
      }
    }

    const thisWeekStart = getWeekStartStr(refDateStr);
    const thisWeekCount = weekCompletedCounts.get(thisWeekStart) || 0;

    let startWeek: string | null = null;
    if (thisWeekCount >= expectedQuota) {
      startWeek = thisWeekStart;
    } else {
      // If current week quota isn't met yet, check if previous week was maintained
      const prevWeekStart = addDaysStr(thisWeekStart, -7);
      const prevWeekCount = weekCompletedCounts.get(prevWeekStart) || 0;
      if (prevWeekCount >= expectedQuota) {
        startWeek = prevWeekStart;
      }
    }

    if (startWeek) {
      let currWeek = startWeek;
      while ((weekCompletedCounts.get(currWeek) || 0) >= expectedQuota) {
        currentStreak++;
        currWeek = addDaysStr(currWeek, -7);
      }
    }
  }

  const longestStreak = Math.max(existingLongestStreak, currentStreak);

  // Completion rate over trailing 30-day window [refDate - 29 days, refDate]
  const windowStartDate = addDaysStr(refDateStr, -29);
  let actualCompletedInWindow = 0;

  for (const c of sortedCheckIns) {
    if (c.date >= windowStartDate && c.date <= refDateStr && c.completed) {
      actualCompletedInWindow++;
    }
  }

  let expectedCountInWindow = 30;
  if (frequency.type === "daily") {
    expectedCountInWindow = 30;
  } else {
    const weeklyQuota =
      frequency.type === "weekly"
        ? frequency.daysOfWeek && frequency.daysOfWeek.length > 0
          ? frequency.daysOfWeek.length
          : 1
        : frequency.timesPerPeriod || 1;
    expectedCountInWindow = Math.ceil((30 / 7) * weeklyQuota);
  }

  const rawRate = expectedCountInWindow > 0 ? actualCompletedInWindow / expectedCountInWindow : 0;
  const completionRate = Math.min(1.0, Math.max(0.0, Math.round(rawRate * 100) / 100));

  return {
    currentStreak,
    longestStreak,
    completionRate,
    lastCheckInDate: lastCompletedDate
  };
}
