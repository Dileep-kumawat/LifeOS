import { describe, it, expect, vi, beforeEach } from "vitest";
import mongoose from "mongoose";

// Mock queue and redis to avoid hanging sockets during tests
vi.mock("../../queue.js", () => ({
  enqueueJob: vi.fn().mockResolvedValue({ queued: true }),
  redis: { on: vi.fn(), status: "ready" }
}));

import {
  getDayBoundaries,
  getStructuredContext,
  formatSchedule,
  formatHabitsWithStatus,
  formatGoals,
  formatFinanceSummary,
  formatRecentNotes
} from "../structuredContext.js";
import { User } from "../../../models/User.js";
import { Event } from "../../../models/Event.js";
import { Habit } from "../../../models/Habit.js";
import { HabitCheckIn } from "../../../models/HabitCheckIn.js";
import { Goal } from "../../../models/Goal.js";
import { Note } from "../../../models/Note.js";
import { Transaction } from "../../../models/Transaction.js";
import { Budget } from "../../../models/Budget.js";

describe("Structured Context Builder (Deterministic Real-time DB State)", () => {
  const userA_id = new mongoose.Types.ObjectId("662c9f1e9f0b2a001c3d4e0a");
  const userB_id = new mongoose.Types.ObjectId("662c9f1e9f0b2a001c3d4e0b");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getDayBoundaries", () => {
    it("computes ISO start and end of day in target timezone", () => {
      const refDate = new Date("2026-09-29T14:30:00.000Z");
      const { startOfDay, endOfDay, dateStr } = getDayBoundaries(refDate, "UTC");

      expect(dateStr).toBe("2026-09-29");
      expect(startOfDay.toISOString()).toBe("2026-09-29T00:00:00.000Z");
      expect(endOfDay.toISOString()).toBe("2026-09-29T23:59:59.999Z");
    });
  });

  describe("formatHabitsWithStatus", () => {
    it("marks habits as [COMPLETED TODAY] or [PENDING - NOT COMPLETED TODAY]", () => {
      const habit1 = {
        _id: new mongoose.Types.ObjectId("662c9f1e9f0b2a001c3d1111"),
        title: "Morning Meditation",
        category: "wellness",
        frequency: { type: "daily", timesPerPeriod: 1 },
        currentStreak: 12,
        reminderTime: "07:00"
      };
      const habit2 = {
        _id: new mongoose.Types.ObjectId("662c9f1e9f0b2a001c3d2222"),
        title: "Evening Workout",
        category: "fitness",
        frequency: { type: "daily", timesPerPeriod: 1 },
        currentStreak: 5
      };

      const completedIds = new Set([habit1._id.toString()]);
      const result = formatHabitsWithStatus([habit1, habit2], completedIds, "2026-09-29");

      expect(result).toContain("Morning Meditation (Daily, wellness): [COMPLETED TODAY]");
      expect(result).toContain("Evening Workout (Daily, fitness): [PENDING - NOT COMPLETED TODAY]");
      expect(result).toContain("Streak: 12 days");
      expect(result).toContain("Streak: 5 days");
    });
  });

  describe("formatSchedule", () => {
    it("formats calendar events with time and location", () => {
      const events = [
        {
          start: new Date("2026-09-29T10:00:00.000Z"),
          end: new Date("2026-09-29T11:30:00.000Z"),
          title: "Architecture Review",
          location: "Conference Room B",
          status: "confirmed"
        }
      ];

      const result = formatSchedule(events as any, "UTC");
      expect(result).toContain("Architecture Review");
      expect(result).toContain("@ Conference Room B");
    });
  });

  describe("formatGoals & formatFinanceSummary & formatRecentNotes", () => {
    it("formats active goals with progress and target date", () => {
      const goals = [
        {
          title: "Master TypeScript",
          progressPercent: 75,
          status: "in_progress",
          targetDate: new Date("2026-12-31T00:00:00.000Z")
        }
      ];

      const result = formatGoals(goals as any);
      expect(result).toContain("Master TypeScript");
      expect(result).toContain("75% complete");
    });

    it("formats monthly category budgets and recent transactions", () => {
      const budgets = [
        { category: "groceries", limit: 500, currentSpend: 320, currency: "USD" }
      ];
      const recentTx = [
        { type: "expense", amount: 45, category: "groceries", note: "Apples", date: new Date("2026-09-29T10:00:00.000Z") }
      ];

      const result = formatFinanceSummary(budgets as any, recentTx as any);
      expect(result).toContain("groceries: 320 / 500 USD spent (64%)");
      expect(result).toContain("Recent Transactions:");
      expect(result).toContain("-$45 [groceries]");
    });

    it("formats recent notes with snippets", () => {
      const notes = [
        {
          title: "Sprint Retrospective",
          contentText: "Completed all migration targets ahead of schedule.",
          updatedAt: new Date("2026-09-28T10:00:00.000Z")
        }
      ];

      const result = formatRecentNotes(notes as any);
      expect(result).toContain("Sprint Retrospective");
      expect(result).toContain("Completed all migration targets");
    });
  });

  describe("getStructuredContext Integration & User Isolation", () => {
    it("enforces strict user isolation: User A queries only return User A data", async () => {
      vi.spyOn(User, "findById").mockReturnValue({
        select: () => ({
          lean: async () => ({ preferences: { timezone: "UTC" } })
        })
      } as any);

      // Mock Event find returning array directly
      vi.spyOn(Event, "find").mockImplementation(((query: any) => {
        expect(query.userId).toEqual(userA_id);
        return Promise.resolve([
          {
            _id: new mongoose.Types.ObjectId(),
            userId: userA_id,
            title: "User A Event",
            startTime: new Date("2026-09-29T09:00:00.000Z"),
            endTime: new Date("2026-09-29T10:00:00.000Z"),
            start: new Date("2026-09-29T09:00:00.000Z"),
            end: new Date("2026-09-29T10:00:00.000Z"),
            status: "confirmed"
          }
        ]) as any;
      }) as any);

      // Mock Habit find
      vi.spyOn(Habit, "find").mockImplementation(((query: any) => {
        expect(query.userId).toEqual(userA_id);
        return {
          sort: () => ({
            lean: async () => [
              {
                _id: new mongoose.Types.ObjectId("662c9f1e9f0b2a001c3d3333"),
                userId: userA_id,
                title: "User A Habit",
                frequency: { type: "daily", timesPerPeriod: 1 },
                currentStreak: 10,
                archived: false
              }
            ]
          })
        } as any;
      }) as any);

      // Mock HabitCheckIn find
      vi.spyOn(HabitCheckIn, "find").mockImplementation(((query: any) => {
        expect(query.userId).toEqual(userA_id);
        return {
          lean: async () => [
            {
              _id: new mongoose.Types.ObjectId(),
              userId: userA_id,
              habitId: new mongoose.Types.ObjectId("662c9f1e9f0b2a001c3d3333"),
              date: "2026-09-29",
              completed: true
            }
          ]
        } as any;
      }) as any);

      // Mock Goal find
      vi.spyOn(Goal, "find").mockImplementation(((query: any) => {
        expect(query.userId).toEqual(userA_id);
        return {
          sort: () => ({
            limit: () => ({
              lean: async () => [
                {
                  _id: new mongoose.Types.ObjectId(),
                  userId: userA_id,
                  title: "User A Goal",
                  progressPercent: 50,
                  status: "in_progress"
                }
              ]
            })
          })
        } as any;
      }) as any);

      // Mock Note find
      vi.spyOn(Note, "find").mockImplementation(((query: any) => {
        expect(query.userId).toEqual(userA_id);
        return {
          sort: () => ({
            limit: () => ({
              select: () => ({
                lean: async () => []
              })
            })
          })
        } as any;
      }) as any);

      // Mock Budget find
      vi.spyOn(Budget, "find").mockImplementation(((query: any) => {
        expect(query.userId).toEqual(userA_id);
        return {
          lean: async () => []
        } as any;
      }) as any);

      // Mock Transaction find
      vi.spyOn(Transaction, "find").mockImplementation(((query: any) => {
        expect(query.userId).toEqual(userA_id);
        return {
          sort: () => ({
            limit: () => ({
              lean: async () => []
            })
          })
        } as any;
      }) as any);

      const ctx = await getStructuredContext(userA_id, {
        referenceDate: new Date("2026-09-29T12:00:00.000Z"),
        timezone: "UTC"
      });

      expect(ctx.hasAnyData).toBe(true);
      expect(ctx.counts.habitsCount).toBe(1);
      expect(ctx.counts.completedHabitsCount).toBe(1);
      expect(ctx.counts.pendingHabitsCount).toBe(0);
      expect(ctx.formattedContext).toContain("User A Habit (Daily): [COMPLETED TODAY]");
      expect(ctx.formattedContext).toContain("User A Goal");
    });

    it("returns hasAnyData: false when user has zero records across all modules", async () => {
      vi.spyOn(User, "findById").mockReturnValue({
        select: () => ({
          lean: async () => ({ preferences: { timezone: "UTC" } })
        })
      } as any);

      vi.spyOn(Event, "find").mockResolvedValue([] as any);
      vi.spyOn(Habit, "find").mockReturnValue({
        sort: () => ({ lean: async () => [] })
      } as any);
      vi.spyOn(HabitCheckIn, "find").mockReturnValue({ lean: async () => [] } as any);
      vi.spyOn(Goal, "find").mockReturnValue({
        sort: () => ({ limit: () => ({ lean: async () => [] }) })
      } as any);
      vi.spyOn(Note, "find").mockReturnValue({
        sort: () => ({ limit: () => ({ select: () => ({ lean: async () => [] }) }) })
      } as any);
      vi.spyOn(Transaction, "find").mockReturnValue({
        sort: () => ({ limit: () => ({ lean: async () => [] }) })
      } as any);
      vi.spyOn(Budget, "find").mockReturnValue({ lean: async () => [] } as any);

      const ctx = await getStructuredContext(userB_id, {
        referenceDate: new Date("2026-09-29T12:00:00.000Z")
      });

      expect(ctx.hasAnyData).toBe(false);
      expect(ctx.counts.habitsCount).toBe(0);
      expect(ctx.counts.eventsCount).toBe(0);
      expect(ctx.formattedContext).toContain("No calendar events scheduled for today");
      expect(ctx.formattedContext).toContain("No active habits tracked in account");
    });
  });
});
