import type { FocusPhase } from "@lifeos/shared";
import { scheduleNotification } from "../notifications/scheduler.js";
import { logger } from "../../logger.js";

/**
 * Calculates additional active work seconds elapsed between doc.lastResumedAt and now,
 * if the session is currently active and in the "work" phase.
 */
export function calculateElapsedWorkSeconds(
  doc: {
    status: string;
    currentPhase: string;
    lastResumedAt?: Date | null;
  },
  now: Date = new Date()
): number {
  if (doc.status !== "active" || doc.currentPhase !== "work" || !doc.lastResumedAt) {
    return 0;
  }
  const diffMs = now.getTime() - new Date(doc.lastResumedAt).getTime();
  return Math.max(0, Math.floor(diffMs / 1000));
}

/**
 * Updates accumulatedWorkSeconds and totalFocusMinutes by accumulating any pending
 * active work segment.
 */
export function accumulatePendingWork(
  doc: {
    status: string;
    currentPhase: string;
    lastResumedAt?: Date | null;
    accumulatedWorkSeconds: number;
    totalFocusMinutes: number;
  },
  now: Date = new Date()
): { accumulatedWorkSeconds: number; totalFocusMinutes: number } {
  const elapsed = calculateElapsedWorkSeconds(doc, now);
  const totalSeconds = (doc.accumulatedWorkSeconds || 0) + elapsed;
  // Round to 2 decimal places (or integer minutes if precise)
  const totalMinutes = Math.round((totalSeconds / 60) * 100) / 100;
  return {
    accumulatedWorkSeconds: totalSeconds,
    totalFocusMinutes: totalMinutes
  };
}

/**
 * Determines the next phase and cycle in a Pomodoro workflow.
 */
export function getNextPhaseAndCycle(
  currentPhase: FocusPhase,
  currentCycle: number,
  longBreakInterval: number = 4
): { nextPhase: FocusPhase; nextCycle: number } {
  if (currentPhase === "work") {
    // Every Nth cycle (e.g. 4th) triggers a long break
    if (currentCycle > 0 && currentCycle % longBreakInterval === 0) {
      return { nextPhase: "long_break", nextCycle: currentCycle };
    }
    return { nextPhase: "break", nextCycle: currentCycle };
  } else {
    // Completed break or long_break -> advance to next work cycle
    return { nextPhase: "work", nextCycle: currentCycle + 1 };
  }
}

/**
 * Enqueues a focus session interval completion alert via Phase 2's notification infra.
 *
 * Distinct from Calendar's pre-scheduled BullMQ delayed jobs: Pomodoro intervals are
 * client-timed (triggered upon client countdown completion) and enqueued for immediate delivery.
 */
export async function sendFocusIntervalNotification(
  session: {
    _id: any;
    userId: any;
    currentCycle: number;
    linkedType?: string;
  },
  completedPhase: FocusPhase,
  nextPhase: FocusPhase
): Promise<void> {
  const userId = session.userId.toString();
  const sessionId = session._id.toString();

  let title = "Focus Interval Complete!";
  let body = "Great job on your focus interval.";

  if (completedPhase === "work") {
    if (nextPhase === "long_break") {
      title = "🎉 4 Cycles Completed! Take a Long Break";
      body = "You've crushed 4 focus cycles. Enjoy a well-deserved 15-minute rest!";
    } else {
      title = "☕ Work Interval Completed!";
      body = "Time for a 5-minute breather. Step away and refresh!";
    }
  } else {
    title = "⚡ Break Finished — Ready to Focus?";
    body = `Cycle ${session.currentCycle} is starting. Let's dive back in!`;
  }

  try {
    // Schedule for immediate delivery via Phase 2 notification engine
    await scheduleNotification({
      userId,
      type: "focus_session_alert",
      channel: "push",
      title,
      body,
      data: {
        sessionId,
        completedPhase,
        nextPhase,
        cycle: session.currentCycle,
        linkedType: session.linkedType
      },
      scheduledFor: new Date()
    });

    // Also schedule an in-app notification so it appears in the Notification feed / inbox
    await scheduleNotification({
      userId,
      type: "focus_session_alert",
      channel: "in_app",
      title,
      body,
      data: {
        sessionId,
        completedPhase,
        nextPhase,
        cycle: session.currentCycle,
        linkedType: session.linkedType
      },
      scheduledFor: new Date()
    });
  } catch (err: any) {
    logger.error({ err, userId, sessionId }, "Failed to enqueue focus interval notification");
  }
}
