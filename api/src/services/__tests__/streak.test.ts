import { describe, it, expect } from "vitest";
import { calculateHabitStats, type FrequencyConfig, type StreakCheckIn } from "../streak.js";

describe("Habit Streak Calculation Service", () => {
  describe("Daily habits", () => {
    it("resets streak to 0 on a missed day, and next check-in starts a new streak of 1", () => {
      const frequency: FrequencyConfig = { type: "daily" };
      // Today: 2026-08-05
      // 2026-08-01: completed, 2026-08-02: completed, 2026-08-03: missed (false), 2026-08-04: completed
      const checkIns: StreakCheckIn[] = [
        { date: "2026-08-01", completed: true },
        { date: "2026-08-02", completed: true },
        { date: "2026-08-03", completed: false }, // Missed day
        { date: "2026-08-04", completed: true } // Next check-in after miss
      ];

      const stats = calculateHabitStats(checkIns, frequency, 2, "2026-08-04");
      expect(stats.currentStreak).toBe(1);
      expect(stats.longestStreak).toBe(2); // Retains high water mark of 2
    });

    it("calculates a caught-up streak correctly after a miss", () => {
      const frequency: FrequencyConfig = { type: "daily" };
      // Today: 2026-08-05
      // Missed on 2026-08-02. Check-ins completed on 08-03, 08-04, 08-05.
      const checkIns: StreakCheckIn[] = [
        { date: "2026-08-01", completed: true },
        { date: "2026-08-02", completed: false },
        { date: "2026-08-03", completed: true },
        { date: "2026-08-04", completed: true },
        { date: "2026-08-05", completed: true }
      ];

      const stats = calculateHabitStats(checkIns, frequency, 1, "2026-08-05");
      expect(stats.currentStreak).toBe(3);
      expect(stats.longestStreak).toBe(3); // Updated high water mark
    });

    it("preserves active streak when today is not yet checked in but yesterday was completed", () => {
      const frequency: FrequencyConfig = { type: "daily" };
      // Today is 2026-08-05. Yesterday (2026-08-04) and 08-03 are completed.
      const checkIns: StreakCheckIn[] = [
        { date: "2026-08-03", completed: true },
        { date: "2026-08-04", completed: true }
      ];

      const stats = calculateHabitStats(checkIns, frequency, 0, "2026-08-05");
      expect(stats.currentStreak).toBe(2);
    });
  });

  describe("Weekly / Custom habits", () => {
    it("maintains streak in period units when weekly quota is met on varying days", () => {
      const frequency: FrequencyConfig = { type: "weekly", daysOfWeek: [1, 3, 5] }; // Quota: 3 per week
      // Week 1 (Mon 2026-07-20): Mon, Wed, Fri
      // Week 2 (Mon 2026-07-27): Tue, Thu, Sat
      // Week 3 (Mon 2026-08-03): Mon, Tue, Wed
      const checkIns: StreakCheckIn[] = [
        // Week 1
        { date: "2026-07-20", completed: true },
        { date: "2026-07-22", completed: true },
        { date: "2026-07-24", completed: true },
        // Week 2
        { date: "2026-07-28", completed: true },
        { date: "2026-07-30", completed: true },
        { date: "2026-08-01", completed: true },
        // Week 3
        { date: "2026-08-03", completed: true },
        { date: "2026-08-04", completed: true },
        { date: "2026-08-05", completed: true }
      ];

      const stats = calculateHabitStats(checkIns, frequency, 0, "2026-08-05");
      expect(stats.currentStreak).toBe(3); // 3 consecutive weeks
    });

    it("resets streak when a whole week is missed", () => {
      const frequency: FrequencyConfig = { type: "custom", timesPerPeriod: 2 }; // Quota: 2 per week
      // Week 1 (Mon 2026-07-20): 2 check-ins
      // Week 2 (Mon 2026-07-27): 0 check-ins (missed week)
      // Week 3 (Mon 2026-08-03): 2 check-ins
      const checkIns: StreakCheckIn[] = [
        // Week 1
        { date: "2026-07-20", completed: true },
        { date: "2026-07-21", completed: true },
        // Week 3
        { date: "2026-08-03", completed: true },
        { date: "2026-08-04", completed: true }
      ];

      const stats = calculateHabitStats(checkIns, frequency, 2, "2026-08-05");
      expect(stats.currentStreak).toBe(1); // Only current week (Week 3)
      expect(stats.longestStreak).toBe(2); // Retains high water mark of 2
    });
  });

  describe("Completion Rate calculation", () => {
    it("computes 30-day trailing completion rate correctly", () => {
      const frequency: FrequencyConfig = { type: "daily" };
      // 15 completed check-ins out of 30 expected in trailing 30 days
      const checkIns: StreakCheckIn[] = [];
      for (let i = 0; i < 15; i++) {
        // Dates 2026-07-07 to 2026-07-21
        const date = new Date(Date.UTC(2026, 6, 7 + i)).toISOString().split("T")[0];
        checkIns.push({ date, completed: true });
      }

      const stats = calculateHabitStats(checkIns, frequency, 0, "2026-08-05");
      expect(stats.completionRate).toBe(0.5); // 15 / 30 = 0.5
    });
  });
});
