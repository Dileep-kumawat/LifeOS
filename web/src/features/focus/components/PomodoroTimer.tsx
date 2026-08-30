import React, { useState } from "react";
import {
  Play,
  Pause,
  Square,
  CheckCircle2,
  BellOff,
  Link2,
  GraduationCap,
  Flag,
  CheckSquare,
  Sparkles,
  Coffee,
  Brain,
  SlidersHorizontal
} from "lucide-react";
import type { FocusPhase, FocusLinkedType, FocusSession } from "@lifeos/shared";
import { SessionLinkPicker } from "./SessionLinkPicker";

export interface PomodoroTimerProps {
  /** Current active/paused focus session or null if idle */
  session?: FocusSession | null;
  /** Explicit override state for Storybook/preview: 'idle' | 'working' | 'break' | 'paused' */
  stateOverride?: "idle" | "working" | "break" | "paused";
  /** Explicit time override for Storybook (in seconds) */
  timeOverrideSeconds?: number;
  /** Work duration setting (minutes) */
  workMinutes?: number;
  /** Short break duration setting (minutes) */
  breakMinutes?: number;
  /** Long break duration setting (minutes) */
  longBreakMinutes?: number;
  /** Long break interval setting (cycles) */
  longBreakInterval?: number;
  /** Linked item details */
  linkedType?: FocusLinkedType;
  linkedId?: string | null;
  linkedTitle?: string;
  /** Do Not Disturb preference toggle */
  dndDuringFocus?: boolean;
  /** Action callbacks */
  onStart?: (config: {
    workMinutes: number;
    breakMinutes: number;
    longBreakMinutes: number;
    longBreakInterval: number;
    linkedType: FocusLinkedType;
    linkedId: string | null;
    dndDuringFocus: boolean;
  }) => void;
  onPause?: () => void;
  onResume?: () => void;
  onComplete?: () => void;
  onAbandon?: () => void;
  onIntervalComplete?: (completedPhase: FocusPhase, cycle: number) => void;
  className?: string;
}

export function PomodoroTimer({
  session,
  stateOverride,
  timeOverrideSeconds,
  workMinutes: initialWorkMinutes = 25,
  breakMinutes: initialBreakMinutes = 5,
  longBreakMinutes: initialLongBreakMinutes = 15,
  longBreakInterval: initialLongBreakInterval = 4,
  linkedType: initialLinkedType = "none",
  linkedId: initialLinkedId = null,
  linkedTitle: initialLinkedTitle = "",
  dndDuringFocus: initialDnd = false,
  onStart,
  onPause,
  onResume,
  onComplete,
  onAbandon,
  onIntervalComplete,
  className = ""
}: PomodoroTimerProps) {
  // Form configuration state for starting a session
  const [workMinutes, setWorkMinutes] = useState(initialWorkMinutes);
  const [breakMinutes, setBreakMinutes] = useState(initialBreakMinutes);
  const [longBreakMinutes, setLongBreakMinutes] = useState(initialLongBreakMinutes);
  const [longBreakInterval, setLongBreakInterval] = useState(initialLongBreakInterval);
  const [linkedType, setLinkedType] = useState<FocusLinkedType>(initialLinkedType);
  const [linkedId, setLinkedId] = useState<string | null>(initialLinkedId);
  const [linkedTitle, setLinkedTitle] = useState<string>(initialLinkedTitle);
  const [dndDuringFocus, setDndDuringFocus] = useState(initialDnd);
  const [showConfig, setShowConfig] = useState(false);
  const [showLinkPicker, setShowLinkPicker] = useState(false);

  // Compute active state based on props or session
  const activePhase: FocusPhase =
    stateOverride === "break"
      ? "break"
      : session?.currentPhase ?? "work";

  const effectiveState: "idle" | "working" | "break" | "paused" =
    stateOverride ??
    (session?.status === "active"
      ? session.currentPhase === "work"
        ? "working"
        : "break"
      : session?.status === "paused"
        ? "paused"
        : "idle");

  const isRunning = effectiveState === "working" || effectiveState === "break";
  const isPaused = effectiveState === "paused";
  const isIdle = effectiveState === "idle";

  // Cycle tracking
  const currentCycle = session?.currentCycle ?? 1;
  const targetLongBreakInterval = session?.longBreakInterval ?? longBreakInterval;

  // Phase duration
  const totalPhaseSeconds =
    (activePhase === "work"
      ? session?.workMinutes ?? workMinutes
      : activePhase === "long_break"
        ? session?.longBreakMinutes ?? longBreakMinutes
        : session?.breakMinutes ?? breakMinutes) * 60;

  // Remaining seconds calculation
  const [localSeconds, setLocalSeconds] = useState(() => {
    if (typeof timeOverrideSeconds === "number") return timeOverrideSeconds;
    if (session?.status === "active" && session.lastResumedAt) {
      const elapsed = Math.floor(
        (Date.now() - new Date(session.lastResumedAt).getTime()) / 1000
      );
      return Math.max(0, totalPhaseSeconds - elapsed);
    }
    return totalPhaseSeconds;
  });

  // Keep countdown ticking when running and not in story override
  React.useEffect(() => {
    if (typeof timeOverrideSeconds === "number") {
      setLocalSeconds(timeOverrideSeconds);
      return;
    }

    if (session?.status === "active" && session.lastResumedAt) {
      const elapsed = Math.floor(
        (Date.now() - new Date(session.lastResumedAt).getTime()) / 1000
      );
      setLocalSeconds(Math.max(0, totalPhaseSeconds - elapsed));

      const interval = setInterval(() => {
        const nowElapsed = Math.floor(
          (Date.now() - new Date(session.lastResumedAt!).getTime()) / 1000
        );
        const rem = Math.max(0, totalPhaseSeconds - nowElapsed);
        setLocalSeconds(rem);

        if (rem <= 0 && onIntervalComplete) {
          onIntervalComplete(session.currentPhase, session.currentCycle);
        }
      }, 1000);

      return () => clearInterval(interval);
    } else if (isIdle) {
      setLocalSeconds(workMinutes * 60);
    }
  }, [session, isIdle, workMinutes, totalPhaseSeconds, timeOverrideSeconds, onIntervalComplete]);

  // Display formatting
  const minutes = Math.floor(localSeconds / 60);
  const seconds = localSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  // Circular progress calculation
  const progressRatio = totalPhaseSeconds > 0 ? Math.min(1, Math.max(0, 1 - localSeconds / totalPhaseSeconds)) : 0;
  const strokeDashoffset = 565.48 * (1 - progressRatio); // radius 90 -> 2 * PI * 90 ≈ 565.48

  // Color mapping based on phase and state
  const phaseColors = {
    work: {
      primary: "#0075de",
      badge: "bg-[#0075de]/10 text-[#0075de] border-[#0075de]/30",
      icon: <Brain className="size-4" />,
      label: "Work Interval"
    },
    break: {
      primary: "#2a9d99",
      badge: "bg-[#2a9d99]/10 text-[#2a9d99] border-[#2a9d99]/30",
      icon: <Coffee className="size-4" />,
      label: "Short Break"
    },
    long_break: {
      primary: "#9d4edd",
      badge: "bg-[#9d4edd]/10 text-[#9d4edd] border-[#9d4edd]/30",
      icon: <Sparkles className="size-4" />,
      label: "Long Break"
    }
  };

  const currentTheme = phaseColors[activePhase];

  const handleStart = () => {
    if (onStart) {
      onStart({
        workMinutes,
        breakMinutes,
        longBreakMinutes,
        longBreakInterval,
        linkedType,
        linkedId,
        dndDuringFocus
      });
    }
    setShowConfig(false);
  };

  return (
    <div
      className={`bg-white rounded-2xl border border-[#e6e6e6] shadow-sm p-6 sm:p-8 max-w-xl mx-auto flex flex-col items-center relative overflow-hidden transition-all duration-200 ${className}`}
      data-testid="pomodoro-timer"
    >
      {/* Background Accent Subtle Glow */}
      <div
        className="absolute -top-24 -right-24 size-64 rounded-full opacity-5 pointer-events-none blur-3xl transition-colors duration-500"
        style={{ backgroundColor: currentTheme.primary }}
      />

      {/* Top Header & Context Badges */}
      <div className="w-full flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          {/* Phase Badge */}
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${currentTheme.badge} transition-colors duration-300`}
          >
            {currentTheme.icon}
            <span>{currentTheme.label}</span>
          </div>

          {/* Paused Indicator */}
          {isPaused && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#f6f5f4] text-[#615d59] border border-[#e6e6e6]">
              Paused
            </span>
          )}
        </div>

        {/* Cycle Pills */}
        <div className="flex items-center gap-1.5" title={`Cycle ${currentCycle} of ${targetLongBreakInterval}`}>
          <span className="text-xs text-[#615d59] font-medium mr-1">
            Cycle {currentCycle}/{targetLongBreakInterval}
          </span>
          {Array.from({ length: targetLongBreakInterval }).map((_, idx) => {
            const cycleNum = idx + 1;
            const isCompleted = cycleNum < currentCycle;
            const isCurrent = cycleNum === currentCycle;
            return (
              <div
                key={cycleNum}
                className={`size-2.5 rounded-full transition-all duration-300 ${
                  isCompleted
                    ? "bg-[#0075de]"
                    : isCurrent
                      ? "bg-[#0075de] ring-2 ring-[#0075de]/30 scale-110"
                      : "bg-[#e6e6e6]"
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Linked Entity Context Pill */}
      {(linkedId || initialLinkedTitle || session?.linkedId) && (
        <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 bg-[#f6f5f4] border border-[#e6e6e6] rounded-lg text-xs text-[#000000] max-w-full truncate shadow-2xs">
          {linkedType === "topic" || session?.linkedType === "topic" ? (
            <GraduationCap className="size-3.5 text-[#0075de] shrink-0" />
          ) : linkedType === "goal" || session?.linkedType === "goal" ? (
            <Flag className="size-3.5 text-[#2a9d99] shrink-0" />
          ) : (
            <CheckSquare className="size-3.5 text-[#dd5b00] shrink-0" />
          )}
          <span className="font-medium text-[#615d59]">Focusing on:</span>
          <span className="font-semibold text-[#000000] truncate">
            {linkedTitle || initialLinkedTitle || session?.linkedId}
          </span>
        </div>
      )}

      {/* Center Countdown Ring */}
      <div className="relative size-64 sm:size-72 flex items-center justify-center my-2 select-none">
        {/* SVG Circular Progress Track */}
        <svg className="size-full -rotate-90" viewBox="0 0 200 200">
          {/* Background Track */}
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="transparent"
            stroke="#f6f5f4"
            strokeWidth="8"
          />
          {/* Animated Value Arc */}
          <circle
            cx="100"
            cy="100"
            r="90"
            fill="transparent"
            stroke={currentTheme.primary}
            strokeWidth="8"
            strokeDasharray="565.48"
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-linear"
          />
        </svg>

        {/* Center Countdown Typography */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-5xl sm:text-6xl font-bold tracking-tight text-[#000000] tabular-nums font-mono">
            {formattedTime}
          </span>
          <span className="text-xs font-medium text-[#615d59] mt-1 uppercase tracking-wider">
            {effectiveState === "paused"
              ? "Session Paused"
              : activePhase === "work"
                ? "Stay Focused"
                : "Rest & Recharge"}
          </span>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="w-full flex items-center justify-center gap-3 mt-6">
        {isIdle ? (
          <>
            <button
              type="button"
              onClick={handleStart}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#0075de] hover:bg-[#005bab] text-white text-sm font-semibold rounded-full shadow-xs hover:shadow-md transition-all active:scale-95 min-w-[140px]"
            >
              <Play className="size-4 fill-white" />
              <span>Start Focus</span>
            </button>
            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              className="p-3 text-[#615d59] hover:text-[#000000] hover:bg-[#f6f5f4] rounded-full border border-[#e6e6e6] transition-colors active:scale-95"
              aria-label="Timer settings"
              title="Custom Durations & Settings"
            >
              <SlidersHorizontal className="size-4" />
            </button>
          </>
        ) : isRunning ? (
          <>
            <button
              type="button"
              onClick={onPause}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-[#f6f5f4] text-[#000000] text-sm font-semibold rounded-full border border-[#e6e6e6] shadow-xs transition-all active:scale-95 min-w-[120px]"
            >
              <Pause className="size-4" />
              <span>Pause</span>
            </button>
            <button
              type="button"
              onClick={onComplete}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#0075de]/10 hover:bg-[#0075de]/20 text-[#0075de] text-sm font-semibold rounded-full transition-all active:scale-95"
              title="Complete Session Early"
            >
              <CheckCircle2 className="size-4" />
              <span>Finish</span>
            </button>
            <button
              type="button"
              onClick={onAbandon}
              className="p-3 text-[#dd5b00] hover:bg-[#dd5b00]/10 rounded-full border border-[#e6e6e6] transition-colors active:scale-95"
              title="Stop / Abandon Session"
              aria-label="Stop Session"
            >
              <Square className="size-4" />
            </button>
          </>
        ) : (
          /* Paused State */
          <>
            <button
              type="button"
              onClick={onResume}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#0075de] hover:bg-[#005bab] text-white text-sm font-semibold rounded-full shadow-xs hover:shadow-md transition-all active:scale-95 min-w-[120px]"
            >
              <Play className="size-4 fill-white" />
              <span>Resume</span>
            </button>
            <button
              type="button"
              onClick={onComplete}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#0075de]/10 hover:bg-[#0075de]/20 text-[#0075de] text-sm font-semibold rounded-full transition-all active:scale-95"
              title="Complete Session"
            >
              <CheckCircle2 className="size-4" />
              <span>Finish</span>
            </button>
            <button
              type="button"
              onClick={onAbandon}
              className="p-3 text-[#dd5b00] hover:bg-[#dd5b00]/10 rounded-full border border-[#e6e6e6] transition-colors active:scale-95"
              title="Stop Session"
              aria-label="Stop Session"
            >
              <Square className="size-4" />
            </button>
          </>
        )}
      </div>

      {/* Session Start Configuration Panel (when expanded in Idle mode) */}
      {isIdle && showConfig && (
        <div className="w-full mt-6 pt-5 border-t border-[#e6e6e6] flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#000000] uppercase tracking-wider">
              Session Settings
            </span>
            <button
              type="button"
              onClick={() => setShowLinkPicker(true)}
              className="inline-flex items-center gap-1.5 text-xs text-[#0075de] font-semibold hover:underline"
            >
              <Link2 className="size-3.5" />
              <span>{linkedTitle ? "Change Link" : "Link Goal / Topic"}</span>
            </button>
          </div>

          {/* Durations Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#615d59] mb-1">
                Work (min)
              </label>
              <input
                type="number"
                min="1"
                max="180"
                value={workMinutes}
                onChange={(e) => setWorkMinutes(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-white border border-[#e6e6e6] rounded-md text-xs font-medium text-[#000000] focus:outline-none focus:border-[#0075de]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#615d59] mb-1">
                Break (min)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={breakMinutes}
                onChange={(e) => setBreakMinutes(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-white border border-[#e6e6e6] rounded-md text-xs font-medium text-[#000000] focus:outline-none focus:border-[#0075de]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#615d59] mb-1">
                Long (min)
              </label>
              <input
                type="number"
                min="1"
                max="120"
                value={longBreakMinutes}
                onChange={(e) => setLongBreakMinutes(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-white border border-[#e6e6e6] rounded-md text-xs font-medium text-[#000000] focus:outline-none focus:border-[#0075de]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#615d59] mb-1">
                Interval (cycles)
              </label>
              <input
                type="number"
                min="1"
                max="12"
                value={longBreakInterval}
                onChange={(e) => setLongBreakInterval(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-white border border-[#e6e6e6] rounded-md text-xs font-medium text-[#000000] focus:outline-none focus:border-[#0075de]"
              />
            </div>
          </div>

          {/* DND Toggle Row */}
          <div className="flex items-center justify-between p-3 bg-[#f6f5f4] rounded-lg">
            <div className="flex items-center gap-2.5">
              <BellOff className="size-4 text-[#615d59]" />
              <div>
                <p className="text-xs font-medium text-[#000000]">Do Not Disturb Mode</p>
                <p className="text-[11px] text-[#615d59]">Mute non-critical notifications while timer is active</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={dndDuringFocus}
              onChange={(e) => setDndDuringFocus(e.target.checked)}
              className="size-4 rounded text-[#0075de] focus:ring-[#0075de]"
            />
          </div>
        </div>
      )}

      {/* Link Picker Modal Popover */}
      {showLinkPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <SessionLinkPicker
            selectedType={linkedType}
            selectedId={linkedId}
            onSelect={(type, id, title) => {
              setLinkedType(type);
              setLinkedId(id);
              setLinkedTitle(title || "");
              setShowLinkPicker(false);
            }}
            onClose={() => setShowLinkPicker(false)}
          />
        </div>
      )}
    </div>
  );
}
