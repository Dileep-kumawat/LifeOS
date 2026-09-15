import { describe, it, expect } from "vitest";
import {
  calculateHabitStats,
  formatDateString,
  addDaysStr,
  getWeekStartStr,
  type FrequencyConfig,
  type StreakCheckIn
} from "../streak.js";

describe("Habit Streak Calculation Service", () => {
  describe("Daily habits", () => {
    const frequency: FrequencyConfig = { type: "daily" };

    it("calculates an unbroken streak of consecutive check-ins through today", () => {
      // 5 consecutive days: 2026-08-01 through 2026-08-05
      const checkIns: StreakCheckIn[] = [
        { date: "2026-08-01", completed: true },
        { date: "2026-08-02", completed: true },
        { date: "2026-08-03", completed: true },
        { date: "2026-08-04", completed: true },
        { date: "2026-08-05", completed: true }
      ];

      const stats = calculateHabitStats(checkIns, frequency, 0, "2026-08-05");
      expect(stats.currentStreak).toBe(5);
      expect(stats.longestStreak).toBe(5);
      expect(stats.lastCheckInDate).toBe("2026-08-05");
    });

    it("preserves active streak when today is not yet checked in but yesterday was completed", () => {
      // Today is 2026-08-05. Yesterday (2026-08-04) and 08-03 are completed.
      const checkIns: StreakCheckIn[] = [
        { date: "2026-08-03", completed: true },
        { date: "2026-08-04", completed: true }
      ];

      const stats = calculateHabitStats(checkIns, frequency, 0, "2026-08-05");
      expect(stats.currentStreak).toBe(2);
      expect(stats.lastCheckInDate).toBe("2026-08-04");
    });

    it("resets streak to 0 on a missed day, and next check-in starts a new streak of 1", () => {
      // Today: 2026-08-04
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
      expect(stats.lastCheckInDate).toBe("2026-08-04");
    });

    it("immediately sets currentStreak to 0 if explicitly marked false today", () => {
      // Yesterday was completed, but today is explicitly false
      const checkIns: StreakCheckIn[] = [
        { date: "2026-08-01", completed: true },
        { date: "2026-08-02", completed: true },
        { date: "2026-08-03", completed: true },
        { date: "2026-08-04", completed: false } // Marked false today
      ];

      const stats = calculateHabitStats(checkIns, frequency, 3, "2026-08-04");
      expect(stats.currentStreak).toBe(0);
      expect(stats.longestStreak).toBe(3); // Retains past longest
    });

    it("breaks streak to 0 when yesterday was missed and today is not checked in", () => {
      // Today is 2026-08-05 (unrecorded). Yesterday (08-04) was false.
      const checkIns: StreakCheckIn[] = [
        { date: "2026-08-01", completed: true },
        { date: "2026-08-02", completed: true },
        { date: "2026-08-03", completed: true },
        { date: "2026-08-04", completed: false }
      ];

      const stats = calculateHabitStats(checkIns, frequency, 3, "2026-08-05");
      expect(stats.currentStreak).toBe(0);
      expect(stats.longestStreak).toBe(3);
    });

    it("breaks streak to 0 on an implicit gap (unrecorded days between past check-ins and today)", () => {
      // Check-ins ended on 2026-08-01. Today is 2026-08-05 with no check-in on 08-02, 08-03, 08-04.
      const checkIns: StreakCheckIn[] = [
        { date: "2026-07-30", completed: true },
        { date: "2026-07-31", completed: true },
        { date: "2026-08-01", completed: true }
      ];

      const stats = calculateHabitStats(checkIns, frequency, 3, "2026-08-05");
      expect(stats.currentStreak).toBe(0);
      expect(stats.longestStreak).toBe(3);
      expect(stats.lastCheckInDate).toBe("2026-08-01");
    });

    it("calculates a caught-up streak correctly after a gap", () => {
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

    it("handles multiple gaps and keeps the highest water mark across gaps", () => {
      // Period 1: 5 days (08-01 to 08-05)
      // Gap: 08-06 missed (false)
      // Period 2: 2 days (08-07 to 08-08)
      // Gap: 08-09 (implicit)
      // Period 3: 3 days (08-10 to 08-12)
      const checkIns: StreakCheckIn[] = [
        { date: "2026-08-01", completed: true },
        { date: "2026-08-02", completed: true },
        { date: "2026-08-03", completed: true },
        { date: "2026-08-04", completed: true },
        { date: "2026-08-05", completed: true },
        { date: "2026-08-06", completed: false },
        { date: "2026-08-07", completed: true },
        { date: "2026-08-08", completed: true },
        { date: "2026-08-10", completed: true },
        { date: "2026-08-11", completed: true },
        { date: "2026-08-12", completed: true }
      ];

      // With existing longest streak of 5 from period 1
      const stats = calculateHabitStats(checkIns, frequency, 5, "2026-08-12");
      expect(stats.currentStreak).toBe(3); // Period 3 current streak
      expect(stats.longestStreak).toBe(5); // Retains 5
    });

    it("correctly handles unsorted check-in arrays", () => {
      // Out of order dates
      const checkIns: StreakCheckIn[] = [
        { date: "2026-08-05", completed: true },
        { date: "2026-08-01", completed: true },
        { date: "2026-08-04", completed: true },
        { date: "2026-08-02", completed: true },
        { date: "2026-08-03", completed: true }
      ];

      const stats = calculateHabitStats(checkIns, frequency, 0, "2026-08-05");
      expect(stats.currentStreak).toBe(5);
      expect(stats.longestStreak).toBe(5);
    });

    it("handles duplicate date check-ins by using the latest entry", () => {
      const checkIns: StreakCheckIn[] = [
        { date: "2026-08-04", completed: false },
        { date: "2026-08-04", completed: true }, // Toggled back to true
        { date: "2026-08-05", completed: true }
      ];

      const stats = calculateHabitStats(checkIns, frequency, 0, "2026-08-05");
      expect(stats.currentStreak).toBe(2);
    });

    it("returns zero stats when check-ins array is empty", () => {
      const stats = calculateHabitStats([], frequency, 0, "2026-08-05");
      expect(stats.currentStreak).toBe(0);
      expect(stats.longestStreak).toBe(0);
      expect(stats.completionRate).toBe(0);
      expect(stats.lastCheckInDate).toBeNull();
    });
  });

  describe("Weekly habits", () => {
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

    it("preserves previous week streak when current week is still in progress and quota not yet reached", () => {
      const frequency: FrequencyConfig = { type: "weekly", daysOfWeek: [1, 3, 5] }; // Quota: 3 per week
      // Week 1 (Mon 2026-07-27): 3 check-ins completed
      // Week 2 (Mon 2026-08-03): Tuesday 2026-08-04 (only 1 check-in so far, quota is 3)
      const checkIns: StreakCheckIn[] = [
        { date: "2026-07-27", completed: true },
        { date: "2026-07-29", completed: true },
        { date: "2026-07-31", completed: true },
        { date: "2026-08-04", completed: true } // 1 check-in in current week
      ];

      // Today is Tuesday 2026-08-04: current week only has 1 check-in, but previous week is complete
      const stats = calculateHabitStats(checkIns, frequency, 0, "2026-08-04");
      expect(stats.currentStreak).toBe(1); // Preserves 1 week streak from previous week
    });

    it("resets weekly streak when previous week missed quota", () => {
      const frequency: FrequencyConfig = { type: "weekly", daysOfWeek: [1, 3, 5] }; // Quota: 3 per week
      // Week 1 (Mon 2026-07-20): 3 check-ins
      // Week 2 (Mon 2026-07-27): only 2 check-ins (missed quota of 3)
      // Week 3 (Mon 2026-08-03): Wednesday 2026-08-05 (only 1 check-in so far)
      const checkIns: StreakCheckIn[] = [
        // Week 1 (met)
        { date: "2026-07-20", completed: true },
        { date: "2026-07-22", completed: true },
        { date: "2026-07-24", completed: true },
        // Week 2 (missed quota: 2 < 3)
        { date: "2026-07-28", completed: true },
        { date: "2026-07-30", completed: true },
        // Week 3 (in progress: 1)
        { date: "2026-08-05", completed: true }
      ];

      const stats = calculateHabitStats(checkIns, frequency, 1, "2026-08-05");
      expect(stats.currentStreak).toBe(0); // Streak broken because Week 2 failed quota
      expect(stats.longestStreak).toBe(1); // Retains Week 1 high water mark
    });

    it("starts fresh streak of 1 when current week meets quota even if previous week failed", () => {
      const frequency: FrequencyConfig = { type: "weekly", daysOfWeek: [1, 3, 5] }; // Quota: 3 per week
      // Week 1: 0 check-ins (missed)
      // Week 2 (Mon 2026-08-03): meets quota of 3
      const checkIns: StreakCheckIn[] = [
        { date: "2026-08-03", completed: true },
        { date: "2026-08-04", completed: true },
        { date: "2026-08-05", completed: true }
      ];

      const stats = calculateHabitStats(checkIns, frequency, 2, "2026-08-05");
      expect(stats.currentStreak).toBe(1);
      expect(stats.longestStreak).toBe(2);
    });

    it("defaults to quota of 1 per week when weekly habit has no daysOfWeek specified", () => {
      const frequency: FrequencyConfig = { type: "weekly" }; // Quota: defaults to 1 per week
      // 1 check-in in Week 1, 1 check-in in Week 2, 1 check-in in Week 3
      const checkIns: StreakCheckIn[] = [
        { date: "2026-07-20", completed: true },
        { date: "2026-07-27", completed: true },
        { date: "2026-08-03", completed: true }
      ];

      const stats = calculateHabitStats(checkIns, frequency, 0, "2026-08-05");
      expect(stats.currentStreak).toBe(3);
    });
  });

  describe("Custom habits", () => {
    it("resets streak when a whole week is missed, then catches up", () => {
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

  describe("Trailing 30-Day Completion Rate", () => {
    it("computes 30-day trailing completion rate correctly for daily habits", () => {
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

    it("clamps completion rate to 1.0 when check-ins meet or exceed expectation", () => {
      const frequency: FrequencyConfig = { type: "daily" };
      const checkIns: StreakCheckIn[] = [];
      for (let i = 0; i < 30; i++) {
        const date = addDaysStr("2026-08-05", -i);
        checkIns.push({ date, completed: true });
      }

      const stats = calculateHabitStats(checkIns, frequency, 0, "2026-08-05");
      expect(stats.completionRate).toBe(1.0);
    });

    it("ignores check-ins that fall outside the trailing 30-day window", () => {
      const frequency: FrequencyConfig = { type: "daily" };
      // Check-ins 60 days ago: should NOT count toward trailing 30 days
      const checkIns: StreakCheckIn[] = [
        { date: "2026-05-01", completed: true },
        { date: "2026-05-02", completed: true },
        { date: "2026-08-05", completed: true } // Only 1 inside the window
      ];

      const stats = calculateHabitStats(checkIns, frequency, 0, "2026-08-05");
      expect(stats.completionRate).toBe(0.03); // 1 / 30 = 0.0333 -> 0.03
    });
  });

  describe("Date Utility Pure Functions", () => {
    describe("formatDateString", () => {
      it("returns YYYY-MM-DD directly if string already in that format", () => {
        expect(formatDateString("2026-08-15")).toBe("2026-08-15");
      });

      it("formats Date object into YYYY-MM-DD", () => {
        const d = new Date("2026-08-15T14:30:00.000Z");
        expect(formatDateString(d)).toBe("2026-08-15");
      });

      it("extracts YYYY-MM-DD from ISO timestamp string", () => {
        expect(formatDateString("2026-08-15T23:59:59.999Z")).toBe("2026-08-15");
      });
    });

    describe("addDaysStr", () => {
      it("adds and subtracts days correctly across normal dates", () => {
        expect(addDaysStr("2026-08-05", 3)).toBe("2026-08-08");
        expect(addDaysStr("2026-08-05", -3)).toBe("2026-08-02");
      });

      it("crosses month boundaries accurately", () => {
        expect(addDaysStr("2026-08-31", 1)).toBe("2026-09-01");
        expect(addDaysStr("2026-09-01", -1)).toBe("2026-08-31");
      });

      it("crosses year boundaries accurately", () => {
        expect(addDaysStr("2026-12-31", 1)).toBe("2027-01-01");
        expect(addDaysStr("2027-01-01", -1)).toBe("2026-12-31");
      });

      it("handles leap years correctly", () => {
        // 2024 is a leap year
        expect(addDaysStr("2024-02-28", 1)).toBe("2024-02-29");
        expect(addDaysStr("2024-02-29", 1)).toBe("2024-03-01");

        // 2026 is not a leap year
        expect(addDaysStr("2026-02-28", 1)).toBe("2026-03-01");
      });
    });

    describe("getWeekStartStr", () => {
      it("returns the same day if date is already Monday", () => {
        // 2026-08-03 is a Monday
        expect(getWeekStartStr("2026-08-03")).toBe("2026-08-03");
      });

      it("returns preceding Monday for midweek days", () => {
        // 2026-08-05 is Wednesday -> Monday was 2026-08-03
        expect(getWeekStartStr("2026-08-05")).toBe("2026-08-03");
        // 2026-08-08 is Saturday -> Monday was 2026-08-03
        expect(getWeekStartStr("2026-08-08")).toBe("2026-08-03");
      });

      it("returns preceding Monday for Sundays", () => {
        // 2026-08-09 is Sunday -> Monday was 2026-08-03
        expect(getWeekStartStr("2026-08-09")).toBe("2026-08-03");
      });
    });
  });
});
