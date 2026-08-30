import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import type { FocusSession, FocusPhase } from "@lifeos/shared";

interface UsePomodoroTimerOptions {
  session: FocusSession | null;
  defaultWorkMinutes?: number;
  defaultBreakMinutes?: number;
  defaultLongBreakMinutes?: number;
  onIntervalComplete?: (completedPhase: FocusPhase, cycle: number) => Promise<void> | void;
}

export function usePomodoroTimer({
  session,
  defaultWorkMinutes = 25,
  defaultBreakMinutes = 5,
  defaultLongBreakMinutes = 15,
  onIntervalComplete
}: UsePomodoroTimerOptions) {
  // Current phase duration in seconds
  const currentPhaseDuration = useMemo(() => {
    if (!session) {
      return defaultWorkMinutes * 60;
    }
    if (session.currentPhase === "work") {
      return (session.workMinutes || defaultWorkMinutes) * 60;
    }
    if (session.currentPhase === "long_break") {
      return (session.longBreakMinutes || defaultLongBreakMinutes) * 60;
    }
    return (session.breakMinutes || defaultBreakMinutes) * 60;
  }, [session, defaultWorkMinutes, defaultBreakMinutes, defaultLongBreakMinutes]);

  // Compute remaining seconds from session timestamps
  const computeRemainingSeconds = useCallback(() => {
    if (!session || session.status === "completed" || session.status === "abandoned") {
      return currentPhaseDuration;
    }

    if (session.status === "paused") {
      // If paused, determine how much of the current phase was completed
      // We can use a snapshot or approximate based on accumulatedWorkSeconds if in work phase
      return currentPhaseDuration;
    }

    if (session.status === "active" && session.lastResumedAt) {
      const elapsedSinceResume = Math.floor(
        (Date.now() - new Date(session.lastResumedAt).getTime()) / 1000
      );
      return Math.max(0, currentPhaseDuration - Math.max(0, elapsedSinceResume));
    }

    return currentPhaseDuration;
  }, [session, currentPhaseDuration]);

  const [remainingSeconds, setRemainingSeconds] = useState<number>(computeRemainingSeconds);
  const onIntervalCompleteRef = useRef(onIntervalComplete);
  onIntervalCompleteRef.current = onIntervalComplete;

  const isTransitioningRef = useRef(false);

  // Sync remaining seconds whenever session state or phase duration updates
  useEffect(() => {
    setRemainingSeconds(computeRemainingSeconds());
    isTransitioningRef.current = false;
  }, [session, computeRemainingSeconds]);

  // Active countdown timer tick
  useEffect(() => {
    if (!session || session.status !== "active") {
      return;
    }

    const interval = setInterval(() => {
      const currentRemaining = computeRemainingSeconds();
      setRemainingSeconds(currentRemaining);

      if (currentRemaining <= 0 && !isTransitioningRef.current) {
        isTransitioningRef.current = true;
        if (onIntervalCompleteRef.current) {
          onIntervalCompleteRef.current(session.currentPhase, session.currentCycle);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session, computeRemainingSeconds]);

  // Formatting helpers
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  // Progress from 0 (start) to 1 (complete)
  const progress = Math.min(1, Math.max(0, 1 - remainingSeconds / currentPhaseDuration));

  return {
    remainingSeconds,
    formattedTime,
    progress,
    currentPhaseDuration,
    phase: session?.currentPhase ?? "work",
    cycle: session?.currentCycle ?? 1,
    longBreakInterval: session?.longBreakInterval ?? 4,
    status: session?.status ?? "idle",
    isActive: session?.status === "active",
    isPaused: session?.status === "paused",
    isIdle: !session || session.status === "completed" || session.status === "abandoned"
  };
}
