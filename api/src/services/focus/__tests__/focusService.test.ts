import { describe, it, expect, vi } from "vitest";
import {
  calculateElapsedWorkSeconds,
  accumulatePendingWork,
  getNextPhaseAndCycle
} from "../focusService.js";

vi.mock("../../notifications/scheduler.js", () => ({
  scheduleNotification: vi.fn().mockResolvedValue("mock-notif-id")
}));

describe("Focus Service - Pomodoro Time Tracking & Phase Transitions", () => {
  const t0 = new Date("2026-08-30T09:00:00.000Z");

  describe("calculateElapsedWorkSeconds", () => {
    it("returns 0 if session status is not active (paused, completed, abandoned)", () => {
      const pausedDoc = {
        status: "paused",
        currentPhase: "work",
        lastResumedAt: t0
      };
      const completedDoc = {
        status: "completed",
        currentPhase: "work",
        lastResumedAt: t0
      };
      const abandonedDoc = {
        status: "abandoned",
        currentPhase: "work",
        lastResumedAt: t0
      };

      const now = new Date(t0.getTime() + 600 * 1000); // 10 minutes later

      expect(calculateElapsedWorkSeconds(pausedDoc, now)).toBe(0);
      expect(calculateElapsedWorkSeconds(completedDoc, now)).toBe(0);
      expect(calculateElapsedWorkSeconds(abandonedDoc, now)).toBe(0);
    });

    it("returns 0 if currentPhase is break or long_break even if status is active", () => {
      const breakDoc = {
        status: "active",
        currentPhase: "break",
        lastResumedAt: t0
      };
      const longBreakDoc = {
        status: "active",
        currentPhase: "long_break",
        lastResumedAt: t0
      };

      const now = new Date(t0.getTime() + 300 * 1000); // 5 minutes later

      expect(calculateElapsedWorkSeconds(breakDoc, now)).toBe(0);
      expect(calculateElapsedWorkSeconds(longBreakDoc, now)).toBe(0);
    });

    it("returns 0 if lastResumedAt is null or undefined", () => {
      const noResumeDoc = {
        status: "active",
        currentPhase: "work",
        lastResumedAt: null
      };

      const now = new Date(t0.getTime() + 600 * 1000);
      expect(calculateElapsedWorkSeconds(noResumeDoc, now)).toBe(0);
    });

    it("calculates exact floored whole seconds during active work", () => {
      const doc = {
        status: "active",
        currentPhase: "work",
        lastResumedAt: t0
      };

      // Exactly 25 minutes = 1500 seconds
      const now = new Date(t0.getTime() + 1500 * 1000);
      expect(calculateElapsedWorkSeconds(doc, now)).toBe(1500);

      // Sub-second precision: 1500.850 seconds -> floors to 1500 seconds
      const subSecondNow = new Date(t0.getTime() + 1500 * 1000 + 850);
      expect(calculateElapsedWorkSeconds(doc, subSecondNow)).toBe(1500);
    });

    it("clamps negative diff to 0 if clock drifts backwards", () => {
      const doc = {
        status: "active",
        currentPhase: "work",
        lastResumedAt: t0
      };

      const pastNow = new Date(t0.getTime() - 10 * 1000);
      expect(calculateElapsedWorkSeconds(doc, pastNow)).toBe(0);
    });
  });

  describe("accumulatePendingWork", () => {
    it("accumulates elapsed seconds and computes rounded totalFocusMinutes", () => {
      const doc = {
        status: "active",
        currentPhase: "work",
        lastResumedAt: t0,
        accumulatedWorkSeconds: 300, // 5 min prior
        totalFocusMinutes: 5.0
      };

      // 10 minutes elapsed (600 seconds)
      const now = new Date(t0.getTime() + 600 * 1000);
      const result = accumulatePendingWork(doc, now);

      expect(result.accumulatedWorkSeconds).toBe(900); // 300 + 600 = 900s
      expect(result.totalFocusMinutes).toBe(15); // 900 / 60 = 15 min
    });

    it("handles fractional minutes rounded to 2 decimal places", () => {
      const doc = {
        status: "active",
        currentPhase: "work",
        lastResumedAt: t0,
        accumulatedWorkSeconds: 0,
        totalFocusMinutes: 0
      };

      // 450 seconds = 7.5 minutes
      const now1 = new Date(t0.getTime() + 450 * 1000);
      const result1 = accumulatePendingWork(doc, now1);
      expect(result1.accumulatedWorkSeconds).toBe(450);
      expect(result1.totalFocusMinutes).toBe(7.5);

      // 80 seconds = 1.33 minutes (1.33333... rounded to 1.33)
      const now2 = new Date(t0.getTime() + 80 * 1000);
      const result2 = accumulatePendingWork(doc, now2);
      expect(result2.accumulatedWorkSeconds).toBe(80);
      expect(result2.totalFocusMinutes).toBe(1.33);
    });

    it("does not increment work seconds when session is inactive or in break phase", () => {
      const doc = {
        status: "paused",
        currentPhase: "work",
        lastResumedAt: null,
        accumulatedWorkSeconds: 600,
        totalFocusMinutes: 10
      };

      const now = new Date(t0.getTime() + 300 * 1000);
      const result = accumulatePendingWork(doc, now);

      expect(result.accumulatedWorkSeconds).toBe(600);
      expect(result.totalFocusMinutes).toBe(10);
    });
  });

  describe("Full Pomodoro Lifecycle Workflows", () => {
    it("calculates exact total work across start → pause → resume → complete", () => {
      // 1. Session start at t0
      const session = {
        status: "active",
        currentPhase: "work",
        lastResumedAt: t0 as Date | null,
        pausedAt: null as Date | null,
        completedAt: null as Date | null,
        accumulatedWorkSeconds: 0,
        totalFocusMinutes: 0
      };

      // 2. User works for 10 minutes (600s), then PAUSES at t1
      const t1 = new Date(t0.getTime() + 600 * 1000);
      const pauseWork = accumulatePendingWork(session, t1);
      session.accumulatedWorkSeconds = pauseWork.accumulatedWorkSeconds;
      session.totalFocusMinutes = pauseWork.totalFocusMinutes;
      session.status = "paused";
      session.pausedAt = t1;
      session.lastResumedAt = null;

      expect(session.accumulatedWorkSeconds).toBe(600);
      expect(session.totalFocusMinutes).toBe(10);
      expect(session.status).toBe("paused");
      expect(session.lastResumedAt).toBeNull();

      // 3. Paused downtime: 5 minutes pass (300s). Verify NO time accumulates
      const tMidPause = new Date(t1.getTime() + 180 * 1000);
      const midPauseCheck = accumulatePendingWork(session, tMidPause);
      expect(midPauseCheck.accumulatedWorkSeconds).toBe(600);
      expect(midPauseCheck.totalFocusMinutes).toBe(10);

      // 4. User RESUMES at t2 (5 minutes after pausing)
      const t2 = new Date(t1.getTime() + 300 * 1000);
      session.status = "active";
      session.pausedAt = null;
      session.lastResumedAt = t2;

      // 5. User works for another 15 minutes (900s), then COMPLETES at t3
      const t3 = new Date(t2.getTime() + 900 * 1000);
      const completeWork = accumulatePendingWork(session, t3);
      session.accumulatedWorkSeconds = completeWork.accumulatedWorkSeconds;
      session.totalFocusMinutes = completeWork.totalFocusMinutes;
      session.status = "completed";
      session.completedAt = t3;
      session.lastResumedAt = null;

      // Total work time = 600s + 900s = 1500s (25.0 minutes)
      // The 300s of pause downtime was completely excluded!
      expect(session.accumulatedWorkSeconds).toBe(1500);
      expect(session.totalFocusMinutes).toBe(25);
      expect(session.status).toBe("completed");
    });

    it("preserves partial active work time when abandoned mid-cycle", () => {
      // Session starts at t0
      const session = {
        status: "active",
        currentPhase: "work",
        lastResumedAt: t0 as Date | null,
        accumulatedWorkSeconds: 0,
        totalFocusMinutes: 0
      };

      // User works for 7 minutes 30 seconds (450s) and ABANDONS
      const tAbandon = new Date(t0.getTime() + 450 * 1000);
      const abandonWork = accumulatePendingWork(session, tAbandon);
      session.accumulatedWorkSeconds = abandonWork.accumulatedWorkSeconds;
      session.totalFocusMinutes = abandonWork.totalFocusMinutes;
      session.status = "abandoned";
      session.lastResumedAt = null;

      expect(session.accumulatedWorkSeconds).toBe(450);
      expect(session.totalFocusMinutes).toBe(7.5);
      expect(session.status).toBe("abandoned");

      // Verify subsequent time does not add anything
      const tLater = new Date(tAbandon.getTime() + 1000 * 1000);
      const laterCheck = accumulatePendingWork(session, tLater);
      expect(laterCheck.accumulatedWorkSeconds).toBe(450);
      expect(laterCheck.totalFocusMinutes).toBe(7.5);
    });

    it("strictly excludes break-phase and long_break-phase time from totalFocusMinutes", () => {
      // Step 1: Work cycle completes 25 minutes (1500s)
      const session = {
        status: "active",
        currentPhase: "work",
        lastResumedAt: t0 as Date | null,
        accumulatedWorkSeconds: 0,
        totalFocusMinutes: 0
      };

      const tWorkEnd = new Date(t0.getTime() + 1500 * 1000);
      const workDone = accumulatePendingWork(session, tWorkEnd);
      session.accumulatedWorkSeconds = workDone.accumulatedWorkSeconds;
      session.totalFocusMinutes = workDone.totalFocusMinutes;

      expect(session.accumulatedWorkSeconds).toBe(1500);
      expect(session.totalFocusMinutes).toBe(25);

      // Step 2: Transition to short break (5 minutes)
      session.currentPhase = "break";
      session.lastResumedAt = tWorkEnd;

      const tBreakEnd = new Date(tWorkEnd.getTime() + 300 * 1000); // 5 min break
      const breakCheck = accumulatePendingWork(session, tBreakEnd);

      // Break duration MUST NOT be added to accumulated work
      expect(breakCheck.accumulatedWorkSeconds).toBe(1500);
      expect(breakCheck.totalFocusMinutes).toBe(25);

      // Step 3: Transition to long break (15 minutes)
      session.currentPhase = "long_break";
      session.lastResumedAt = tBreakEnd;

      const tLongBreakEnd = new Date(tBreakEnd.getTime() + 900 * 1000); // 15 min long break
      const longBreakCheck = accumulatePendingWork(session, tLongBreakEnd);

      expect(longBreakCheck.accumulatedWorkSeconds).toBe(1500);
      expect(longBreakCheck.totalFocusMinutes).toBe(25);

      // Step 4: Resume second work cycle (25 minutes)
      session.currentPhase = "work";
      session.lastResumedAt = tLongBreakEnd;

      const tCycle2End = new Date(tLongBreakEnd.getTime() + 1500 * 1000);
      const cycle2Done = accumulatePendingWork(session, tCycle2End);

      // Total = 1500s (cycle 1) + 1500s (cycle 2) = 3000s = 50 min.
      // 5 min short break + 15 min long break = 20 min entirely excluded.
      expect(cycle2Done.accumulatedWorkSeconds).toBe(3000);
      expect(cycle2Done.totalFocusMinutes).toBe(50);
    });
  });

  describe("getNextPhaseAndCycle", () => {
    it("transitions standard cycles: work -> break (same cycle), break -> work (next cycle)", () => {
      // Cycle 1 work finishes -> short break, still cycle 1
      const step1 = getNextPhaseAndCycle("work", 1, 4);
      expect(step1.nextPhase).toBe("break");
      expect(step1.nextCycle).toBe(1);

      // Cycle 1 break finishes -> work, advances to cycle 2
      const step2 = getNextPhaseAndCycle("break", 1, 4);
      expect(step2.nextPhase).toBe("work");
      expect(step2.nextCycle).toBe(2);

      // Cycle 2 work finishes -> short break, cycle 2
      const step3 = getNextPhaseAndCycle("work", 2, 4);
      expect(step3.nextPhase).toBe("break");
      expect(step3.nextCycle).toBe(2);

      // Cycle 3 work finishes -> short break, cycle 3
      const step4 = getNextPhaseAndCycle("work", 3, 4);
      expect(step4.nextPhase).toBe("break");
      expect(step4.nextCycle).toBe(3);
    });

    it("triggers long_break on every 4th cycle by default", () => {
      // Cycle 4 work finishes -> long break (cycle 4)
      const step4Work = getNextPhaseAndCycle("work", 4, 4);
      expect(step4Work.nextPhase).toBe("long_break");
      expect(step4Work.nextCycle).toBe(4);

      // Cycle 4 long break finishes -> work (cycle 5)
      const step4Break = getNextPhaseAndCycle("long_break", 4, 4);
      expect(step4Break.nextPhase).toBe("work");
      expect(step4Break.nextCycle).toBe(5);
    });

    it("supports custom longBreakInterval", () => {
      // Custom longBreakInterval = 2
      const step1 = getNextPhaseAndCycle("work", 1, 2);
      expect(step1.nextPhase).toBe("break");

      const step2 = getNextPhaseAndCycle("work", 2, 2);
      expect(step2.nextPhase).toBe("long_break");
      expect(step2.nextCycle).toBe(2);
    });
  });
});
