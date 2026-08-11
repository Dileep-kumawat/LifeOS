import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Infrastructure mocks (must come before any service imports) ───────────────

// Prevent real Redis/ioredis connection at module load time
vi.mock("../../db/redis.js", () => ({
  redis: {
    on: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    quit: vi.fn()
  }
}));

// Mock BullMQ so Queue never opens a TCP socket to Redis
vi.mock("bullmq", () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue({ id: "job-123" }),
    getJob: vi.fn().mockResolvedValue(null)
  })),
  Worker: vi.fn(),
  QueueEvents: vi.fn()
}));

// ─── Service-level mocks ──────────────────────────────────────────────────────

// queue.ts lives at services/queue.ts — relative from __tests__/ = "../../queue.js"
vi.mock("../../queue.js", () => ({
  enqueueJob: vi.fn().mockResolvedValue({ queued: true, duplicate: false, jobId: "job-123" }),
  jobsQueue: {
    getJob: vi.fn()
  }
}));

vi.mock("../../../models/Event.js", () => ({
  Event: {
    find: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null)
  }
}));

vi.mock("../../../models/Habit.js", () => ({
  Habit: {
    find: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null)
  }
}));

vi.mock("../../../models/HabitCheckIn.js", () => ({
  HabitCheckIn: {
    find: vi.fn()
  }
}));

vi.mock("../../../models/User.js", () => ({
  User: {
    findById: vi.fn().mockResolvedValue(null)
  }
}));

vi.mock("../scheduler.js", () => ({
  scheduleNotification: vi.fn().mockResolvedValue({
    notificationId: "notif-1",
    batched: false,
    enqueued: true,
    duplicate: false
  })
}));

// ─── Subject imports (after all vi.mock calls) ────────────────────────────────

import { enqueueJob, jobsQueue } from "../../queue.js";
import { Habit } from "../../../models/Habit.js";
import { HabitCheckIn } from "../../../models/HabitCheckIn.js";
import { User } from "../../../models/User.js";
import { scheduleNotification } from "../scheduler.js";
import { scheduleEventReminder, cancelEventReminder } from "../calendarReminders.js";
import { processHabitReminders } from "../habitReminders.js";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Calendar & Habit Reminders Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Restore default mock implementations after clearAllMocks
    vi.mocked(enqueueJob).mockResolvedValue({ queued: true, duplicate: false, jobId: "job-123" });

    vi.mocked(jobsQueue.getJob).mockImplementation(async (id: string) => {
      if (!id) return null;
      return { id, remove: vi.fn().mockResolvedValue(true) } as any;
    });

    vi.mocked(scheduleNotification).mockResolvedValue({
      notificationId: "notif-1",
      batched: false,
      enqueued: true,
      duplicate: false
    });

    vi.mocked(HabitCheckIn.find).mockReturnValue({
      select: vi.fn().mockResolvedValue([])
    } as any);

    vi.mocked(Habit.find).mockResolvedValue([]);
    vi.mocked(User.findById).mockResolvedValue(null);
  });

  // ── Calendar Event Reminders ──────────────────────────────────────────────

  describe("Calendar Event Reminders", () => {
    it("creates a BullMQ job when an event with reminderLeadMinutes is scheduled", async () => {
      const startTime = new Date("2026-08-10T10:00:00.000Z");
      const event = {
        _id: { toString: () => "event-1" },
        userId: { toString: () => "user-1" },
        startTime,
        reminderLeadMinutes: 30
      } as any;

      const jobId = await scheduleEventReminder(event);

      expect(jobId).toBe("job-123");
      expect(enqueueJob).toHaveBeenCalledTimes(1);
      expect(enqueueJob).toHaveBeenCalledWith(
        "calendar_reminder",
        { eventId: "event-1", userId: "user-1" },
        { scheduledFor: new Date("2026-08-10T09:30:00.000Z") }
      );
    });

    it("returns null and does not enqueue when reminderLeadMinutes is null", async () => {
      const event = {
        _id: { toString: () => "event-2" },
        userId: { toString: () => "user-1" },
        startTime: new Date("2026-08-10T10:00:00.000Z"),
        reminderLeadMinutes: null
      } as any;

      const jobId = await scheduleEventReminder(event);

      expect(jobId).toBeNull();
      expect(enqueueJob).not.toHaveBeenCalled();
    });

    it("cancels existing job by calling jobsQueue.getJob then job.remove()", async () => {
      const removeFn = vi.fn().mockResolvedValue(true);
      vi.mocked(jobsQueue.getJob).mockResolvedValue({ id: "old-job-456", remove: removeFn } as any);

      await cancelEventReminder("old-job-456");

      expect(jobsQueue.getJob).toHaveBeenCalledWith("old-job-456");
      expect(removeFn).toHaveBeenCalled();
    });

    it("cancels old job and reschedules a new one on event update", async () => {
      const removeFn = vi.fn().mockResolvedValue(true);
      vi.mocked(jobsQueue.getJob).mockResolvedValue({ id: "old-job-456", remove: removeFn } as any);

      // Simulate PATCH route: cancel old job first
      await cancelEventReminder("old-job-456");
      expect(removeFn).toHaveBeenCalledTimes(1);

      // Then schedule new job for the updated event time
      const updatedEvent = {
        _id: { toString: () => "event-1" },
        userId: { toString: () => "user-1" },
        startTime: new Date("2026-08-10T11:00:00.000Z"),
        reminderLeadMinutes: 10
      } as any;

      const newJobId = await scheduleEventReminder(updatedEvent);
      expect(newJobId).toBe("job-123");
      expect(enqueueJob).toHaveBeenCalledWith(
        "calendar_reminder",
        { eventId: "event-1", userId: "user-1" },
        { scheduledFor: new Date("2026-08-10T10:50:00.000Z") }
      );
    });

    it("no-ops gracefully when cancelEventReminder receives null", async () => {
      await cancelEventReminder(null);
      expect(jobsQueue.getJob).not.toHaveBeenCalled();
    });
  });

  // ── Habit Reminders ───────────────────────────────────────────────────────

  describe("Habit Reminders Batching & Preferences", () => {
    const activeUser = {
      _id: "user-1",
      status: "active",
      notificationPreferences: { habitReminders: { push: true, inApp: true } }
    };

    it("skips habits already checked in today, schedules reminders only for pending habits", async () => {
      vi.mocked(User.findById).mockResolvedValue(activeUser as any);
      vi.mocked(Habit.find).mockResolvedValue([
        {
          _id: { toString: () => "h1" },
          userId: { toString: () => "user-1" },
          title: "Morning Run",
          reminderTime: "08:00",
          reminderEnabled: true
        },
        {
          _id: { toString: () => "h2" },
          userId: { toString: () => "user-1" },
          title: "Read 20 pages",
          reminderTime: "08:00",
          reminderEnabled: true
        }
      ] as any);

      // h1 is already checked in; h2 is pending
      vi.mocked(HabitCheckIn.find).mockReturnValue({
        select: vi.fn().mockResolvedValue([{ habitId: { toString: () => "h1" } }])
      } as any);

      const result = await processHabitReminders("08:00", "2026-08-07");

      expect(result.scheduledUsers).toBe(1);
      expect(result.totalHabitsReminded).toBe(1);
      expect(scheduleNotification).toHaveBeenCalledTimes(1);
      expect(scheduleNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          type: "habit_reminder",
          data: { habitId: "h2" }
        })
      );
    });

    it("returns 0 when no habits match the target hour (DB-level filter on reminderEnabled)", async () => {
      vi.mocked(Habit.find).mockResolvedValue([]);

      const result = await processHabitReminders("08:00", "2026-08-07");

      expect(result.scheduledUsers).toBe(0);
      expect(result.totalHabitsReminded).toBe(0);
      expect(scheduleNotification).not.toHaveBeenCalled();
    });

    it("skips scheduling when global habitReminders push preference is disabled", async () => {
      const userPrefOff = {
        _id: "user-1",
        status: "active",
        notificationPreferences: { habitReminders: { push: false, inApp: false } }
      };
      vi.mocked(User.findById).mockResolvedValue(userPrefOff as any);
      vi.mocked(Habit.find).mockResolvedValue([
        {
          _id: { toString: () => "h1" },
          userId: { toString: () => "user-1" },
          title: "Meditation",
          reminderTime: "08:00",
          reminderEnabled: true
        }
      ] as any);

      const result = await processHabitReminders("08:00", "2026-08-07");

      expect(result.scheduledUsers).toBe(0);
      expect(result.totalHabitsReminded).toBe(0);
      expect(scheduleNotification).not.toHaveBeenCalled();
    });

    it("skips inactive users even if they have pending habits", async () => {
      const inactiveUser = { _id: "user-2", status: "suspended", notificationPreferences: {} };
      vi.mocked(User.findById).mockResolvedValue(inactiveUser as any);
      vi.mocked(Habit.find).mockResolvedValue([
        {
          _id: { toString: () => "h3" },
          userId: { toString: () => "user-2" },
          title: "Yoga",
          reminderTime: "08:00",
          reminderEnabled: true
        }
      ] as any);

      const result = await processHabitReminders("08:00", "2026-08-07");

      expect(result.scheduledUsers).toBe(0);
      expect(scheduleNotification).not.toHaveBeenCalled();
    });

    it("calls scheduleNotification once per pending habit (batching is handled inside scheduler)", async () => {
      vi.mocked(User.findById).mockResolvedValue(activeUser as any);
      const fiveHabits = Array.from({ length: 5 }, (_, i) => ({
        _id: { toString: () => `h${i}` },
        userId: { toString: () => "user-1" },
        title: `Habit ${i}`,
        reminderTime: "08:00",
        reminderEnabled: true
      }));
      vi.mocked(Habit.find).mockResolvedValue(fiveHabits as any);
      vi.mocked(HabitCheckIn.find).mockReturnValue({
        select: vi.fn().mockResolvedValue([])
      } as any);

      const result = await processHabitReminders("08:00", "2026-08-07");

      expect(result.scheduledUsers).toBe(1);
      expect(result.totalHabitsReminded).toBe(5);
      // One scheduleNotification call per habit; dedupe/batching is scheduler's responsibility
      expect(scheduleNotification).toHaveBeenCalledTimes(5);
    });
  });
});
