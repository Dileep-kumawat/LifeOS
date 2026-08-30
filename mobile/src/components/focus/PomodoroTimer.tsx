import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert
} from "react-native";
import {
  Play,
  Pause,
  Square,
  CheckCircle2,
  BellOff,
  Link2
} from "lucide-react-native";
import { ThemedText } from "../ui/ThemedText";
import { Card } from "../ui/Card";
import { ProgressBar } from "../ui/ProgressBar";
import { colors, radius, spacing, shadows } from "../../theme";
import type { LocalFocusSession } from "../../db/schema";
import { SessionLinkPicker } from "./SessionLinkPicker";

export interface PomodoroTimerProps {
  session?: LocalFocusSession | null;
  userId: string;
  defaultLinkedType?: "task" | "goal" | "topic" | "none";
  defaultLinkedId?: string | null;
  defaultLinkedTitle?: string;
  dndDuringFocus?: boolean;
  onStart: (config: {
    workMinutes: number;
    breakMinutes: number;
    longBreakMinutes: number;
    longBreakInterval: number;
    linkedType: "task" | "goal" | "topic" | "none";
    linkedId: string | null;
    dndDuringFocus: boolean;
  }) => Promise<void>;
  onPause: () => Promise<void>;
  onResume: () => Promise<void>;
  onComplete: () => Promise<void>;
  onAbandon: () => Promise<void>;
  onIntervalComplete: (
    completedPhase: "work" | "break" | "long_break",
    nextPhase?: "work" | "break" | "long_break",
    cycle?: number
  ) => Promise<void>;
  onDndChange?: (enabled: boolean) => void;
}

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({
  session,
  userId,
  defaultLinkedType = "none",
  defaultLinkedId = null,
  defaultLinkedTitle = "",
  dndDuringFocus: initialDnd = false,
  onStart,
  onPause,
  onResume,
  onComplete,
  onAbandon,
  onIntervalComplete,
  onDndChange
}) => {
  // Config state
  const [workMinutes] = useState(session?.workMinutes ?? 25);
  const [breakMinutes] = useState(session?.breakMinutes ?? 5);
  const [longBreakMinutes] = useState(session?.longBreakMinutes ?? 15);
  const [longBreakInterval] = useState(session?.longBreakInterval ?? 4);
  const [linkedType, setLinkedType] = useState<"task" | "goal" | "topic" | "none">(
    session?.linkedType ?? defaultLinkedType
  );
  const [linkedId, setLinkedId] = useState<string | null>(
    session?.linkedId ?? defaultLinkedId
  );
  const [linkedTitle, setLinkedTitle] = useState<string>(defaultLinkedTitle);
  const [dndEnabled, setDndEnabled] = useState(initialDnd);

  const [showLinkPicker, setShowLinkPicker] = useState(false);

  // Active state determination
  const activePhase = session?.currentPhase ?? "work";
  const status = session?.status ?? "idle";
  const isRunning = status === "active";
  const isPaused = status === "paused";
  const isIdle = !session || status === "completed" || status === "abandoned";
  const hasLink = linkedType !== "none";

  const currentCycle = session?.currentCycle ?? 1;

  // Phase total seconds
  const totalPhaseSeconds =
    (activePhase === "work"
      ? session?.workMinutes ?? workMinutes
      : activePhase === "long_break"
        ? session?.longBreakMinutes ?? longBreakMinutes
        : session?.breakMinutes ?? breakMinutes) * 60;

  // Remaining seconds
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    if (session?.status === "active" && session.lastResumedAt) {
      const elapsed = Math.floor(
        (Date.now() - new Date(session.lastResumedAt).getTime()) / 1000
      );
      return Math.max(0, totalPhaseSeconds - elapsed);
    }
    return totalPhaseSeconds;
  });

  // Keep countdown ticking
  useEffect(() => {
    if (!isRunning) {
      if (isPaused) {
        // preserve current remaining
      } else {
        setSecondsRemaining(totalPhaseSeconds);
      }
      return;
    }

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Trigger interval complete
          const nextIsLongBreak =
            currentCycle % (session?.longBreakInterval || longBreakInterval) === 0;
          const nextPhase =
            activePhase === "work"
              ? nextIsLongBreak
                ? "long_break"
                : "break"
              : "work";
          const nextCycle = activePhase === "work" ? currentCycle : currentCycle + 1;

          onIntervalComplete(activePhase, nextPhase, nextCycle);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [
    isRunning,
    isPaused,
    totalPhaseSeconds,
    activePhase,
    currentCycle,
    session,
    longBreakInterval,
    onIntervalComplete
  ]);

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const progressFraction =
    totalPhaseSeconds > 0
      ? Math.min(1, Math.max(0, (totalPhaseSeconds - secondsRemaining) / totalPhaseSeconds))
      : 0;

  const handleStart = async () => {
    await onStart({
      workMinutes,
      breakMinutes,
      longBreakMinutes,
      longBreakInterval,
      linkedType,
      linkedId,
      dndDuringFocus: dndEnabled
    });
  };

  const handleDndToggle = (val: boolean) => {
    setDndEnabled(val);
    onDndChange?.(val);
  };

  const phaseColor =
    activePhase === "work"
      ? colors.primary
      : activePhase === "long_break"
        ? colors.accentPurpleDeep
        : colors.accentGreen;

  const phaseTitle =
    activePhase === "work"
      ? "Focus Time"
      : activePhase === "long_break"
        ? "Long Break"
        : "Short Break";

  return (
    <Card style={[styles.timerCard, shadows.card]}>
      {/* Timer Header */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View style={[styles.phaseDot, { backgroundColor: phaseColor }]} />
          <ThemedText variant="bodyMd" style={styles.phaseTitleText}>
            {isIdle ? "Pomodoro Focus Timer" : phaseTitle}
          </ThemedText>
        </View>

        {!isIdle && (
          <View style={styles.cycleBadge}>
            <ThemedText variant="caption" color={colors.inkSecondary} style={styles.cycleText}>
              Cycle {currentCycle} of {session?.longBreakInterval || longBreakInterval}
            </ThemedText>
          </View>
        )}
      </View>

      {/* Linked Entity Pill */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => !isRunning && setShowLinkPicker(true)}
        style={[
          styles.linkBanner,
          hasLink && styles.linkBannerActive,
          isRunning && styles.linkBannerDisabled
        ]}
      >
        <View style={styles.linkBannerContent}>
          <Link2
            size={14}
            color={hasLink ? colors.primary : colors.inkMuted}
          />
          <ThemedText
            variant="caption"
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[
              styles.linkText,
              hasLink && styles.linkTextActive,
              { flex: 1 }
            ]}
          >
            {hasLink ? `Linked: ${linkedTitle || linkedType}` : "Link to a Topic or Goal..."}
          </ThemedText>
        </View>
      </TouchableOpacity>

      {/* Main Countdown Display */}
      <View style={styles.timerDisplaySection}>
        <ThemedText
          variant="display1"
          numberOfLines={1}
          adjustsFontSizeToFit
          style={[styles.countdownText, { color: isPaused ? "#d97706" : colors.ink }]}
        >
          {formatTime(secondsRemaining)}
        </ThemedText>

        <ProgressBar
          progress={progressFraction}
          color={isPaused ? "#f59e0b" : phaseColor}
          style={styles.progressBar}
        />

        {isPaused && (
          <View style={styles.pausedBadge}>
            <ThemedText variant="caption" style={styles.pausedText}>
              TIMER PAUSED
            </ThemedText>
          </View>
        )}
      </View>

      {/* Controls Bar */}
      <View style={styles.controlsRow}>
        {isIdle ? (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleStart}
            style={styles.startBtn}
          >
            <Play size={20} color={colors.onPrimary} fill={colors.onPrimary} />
            <ThemedText variant="bodyMd" style={styles.startBtnText}>
              Start Focus Session ({workMinutes}m)
            </ThemedText>
          </TouchableOpacity>
        ) : isRunning ? (
          <View style={styles.activeControlsRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onPause}
              style={[styles.actionBtn, styles.pauseBtn]}
            >
              <Pause size={18} color="#92400e" fill="#92400e" />
              <ThemedText variant="bodySm" style={{ color: "#92400e", fontWeight: "700" }}>
                Pause
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onComplete}
              style={[styles.actionBtn, styles.completeBtn]}
            >
              <CheckCircle2 size={18} color={colors.accentGreen} />
              <ThemedText variant="bodySm" style={{ color: colors.accentGreen, fontWeight: "700" }}>
                Done
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                Alert.alert("Abandon Session?", "Accumulated focus time will be saved to your stats.", [
                  { text: "Keep Going", style: "cancel" },
                  { text: "Abandon", style: "destructive", onPress: onAbandon }
                ]);
              }}
              style={[styles.actionBtn, styles.abandonBtn]}
            >
              <Square size={16} color={colors.error} />
            </TouchableOpacity>
          </View>
        ) : isPaused ? (
          <View style={styles.activeControlsRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onResume}
              style={[styles.actionBtn, styles.resumeBtn]}
            >
              <Play size={18} color={colors.onPrimary} fill={colors.onPrimary} />
              <ThemedText variant="bodySm" style={{ color: colors.onPrimary, fontWeight: "700" }}>
                Resume
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onComplete}
              style={[styles.actionBtn, styles.completeBtn]}
            >
              <CheckCircle2 size={18} color={colors.accentGreen} />
              <ThemedText variant="bodySm" style={{ color: colors.accentGreen, fontWeight: "700" }}>
                Done
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onAbandon}
              style={[styles.actionBtn, styles.abandonBtn]}
            >
              <Square size={16} color={colors.error} />
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {/* DND Toggle & Settings Toggle (When Idle) */}
      <View style={styles.footerRow}>
        <View style={styles.dndRow}>
          <BellOff size={14} color={dndEnabled ? colors.primary : colors.inkMuted} />
          <ThemedText variant="caption" color={colors.inkMuted} style={styles.dndLabel}>
            Do Not Disturb during session (FR-8.4)
          </ThemedText>
          <Switch
            value={dndEnabled}
            onValueChange={handleDndToggle}
            trackColor={{ false: colors.hairline, true: colors.primary }}
            style={{ transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] }}
          />
        </View>
      </View>

      {/* Link Picker Modal */}
      <SessionLinkPicker
        visible={showLinkPicker}
        onClose={() => setShowLinkPicker(false)}
        userId={userId}
        currentType={linkedType}
        currentId={linkedId}
        onSelect={(link) => {
          setLinkedType(link.linkedType);
          setLinkedId(link.linkedId);
          setLinkedTitle(link.linkedTitle || "");
        }}
      />
    </Card>
  );
};

const styles = StyleSheet.create({
  timerCard: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderColor: colors.hairline,
    gap: spacing.md
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  phaseDot: {
    width: 10,
    height: 10,
    borderRadius: 5
  },
  phaseTitleText: {
    fontWeight: "700",
    color: colors.ink
  },
  cycleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.canvasSoft,
    borderWidth: 1,
    borderColor: colors.hairline
  },
  cycleText: {
    fontWeight: "600"
  },
  linkBanner: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.canvasSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline
  },
  linkBannerActive: {
    backgroundColor: "rgba(0, 117, 222, 0.05)",
    borderColor: "rgba(0, 117, 222, 0.2)"
  },
  linkBannerDisabled: {
    opacity: 0.85
  },
  linkBannerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    minWidth: 0
  },
  linkText: {
    color: colors.inkMuted
  },
  linkTextActive: {
    color: colors.primary,
    fontWeight: "700"
  },
  timerDisplaySection: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    gap: spacing.sm
  },
  countdownText: {
    fontSize: 48,
    fontWeight: "700",
    letterSpacing: -1.5,
    fontVariant: ["tabular-nums"]
  },
  progressBar: {
    width: "100%",
    marginTop: spacing.xs
  },
  pausedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#fde68a",
    marginTop: spacing.xxs
  },
  pausedText: {
    color: "#b45309",
    fontWeight: "700",
    fontSize: 10
  },
  controlsRow: {
    marginTop: spacing.xs
  },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: 14,
    backgroundColor: colors.primary,
    borderRadius: radius.full
  },
  startBtnText: {
    color: colors.onPrimary,
    fontWeight: "700"
  },
  activeControlsRow: {
    flexDirection: "row",
    gap: spacing.xs,
    alignItems: "center"
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1
  },
  pauseBtn: {
    flex: 1.5,
    backgroundColor: "#fef3c7",
    borderColor: "#fde68a"
  },
  resumeBtn: {
    flex: 1.5,
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  completeBtn: {
    flex: 1.2,
    backgroundColor: "#ecfdf5",
    borderColor: "#a7f3d0"
  },
  abandonBtn: {
    paddingHorizontal: spacing.md,
    backgroundColor: "#fff1f2",
    borderColor: "#fecdd3"
  },
  footerRow: {
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    paddingTop: spacing.xs
  },
  dndRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  dndLabel: {
    flex: 1,
    marginLeft: 6
  }
});
