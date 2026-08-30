import { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  RefreshControl
} from "react-native";
import {
  Flame,
  Clock
} from "lucide-react-native";
import { ScreenContainer } from "../../components/ui/ScreenContainer";
import { ThemedText } from "../../components/ui/ThemedText";
import { Card } from "../../components/ui/Card";
import { useAuthStore } from "../../store/authStore";
import { focusRepo } from "../../db/repositories/focusRepo";
import { topicRepo } from "../../db/repositories/topicRepo";
import { goalRepo } from "../../db/repositories/goalRepo";
import { syncEngine } from "../../services/syncEngine";
import { notificationService } from "../../services/notificationService";
import { colors, radius, spacing } from "../../theme";
import type { LocalFocusSession, LocalTopic, LocalGoal } from "../../db/schema";

import { PomodoroTimer } from "../../components/focus/PomodoroTimer";
import { SessionHistoryList } from "../../components/focus/SessionHistoryList";

export function FocusScreen({ route }: any) {
  const user = useAuthStore((state) => state.user);

  const [activeSession, setActiveSession] = useState<LocalFocusSession | null>(null);
  const [historySessions, setHistorySessions] = useState<LocalFocusSession[]>([]);
  const [topicsMap, setTopicsMap] = useState<Record<string, LocalTopic>>({});
  const [goalsMap, setGoalsMap] = useState<Record<string, LocalGoal>>({});
  const [refreshing, setRefreshing] = useState(false);

  // Link params from navigation (e.g. from StudyScreen topic detail)
  const navLinkedType = route?.params?.linkedType || "none";
  const navLinkedId = route?.params?.linkedId || null;
  const navLinkedTitle = route?.params?.linkedTitle || "";

  const loadData = useCallback(async () => {
    if (!user?.id) return;

    const [active, history, topics, goals] = await Promise.all([
      focusRepo.getActiveSession(user.id),
      focusRepo.listSessions(user.id),
      topicRepo.listTopics(user.id),
      goalRepo.listGoals(user.id)
    ]);

    setActiveSession(active);
    setHistorySessions(history);

    const tMap: Record<string, LocalTopic> = {};
    topics.forEach((t) => (tMap[t.id] = t));
    const gMap: Record<string, LocalGoal> = {};
    goals.forEach((g) => (gMap[g.id] = g));

    setTopicsMap(tMap);
    setGoalsMap(gMap);

    // Update notification service focus active status for FR-8.4 DND suppression
    notificationService.setFocusSessionActive(active?.status === "active");
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadData();
      await syncEngine.syncNow();
      await loadData();
    } finally {
      setRefreshing(false);
    }
  };

  // Timer Handlers
  const handleStartSession = async (config: {
    workMinutes: number;
    breakMinutes: number;
    longBreakMinutes: number;
    longBreakInterval: number;
    linkedType: "task" | "goal" | "topic" | "none";
    linkedId: string | null;
    dndDuringFocus: boolean;
  }) => {
    if (!user?.id) return;

    notificationService.setDndDuringFocus(config.dndDuringFocus);
    notificationService.setFocusSessionActive(true);

    const newSession = await focusRepo.startSession({
      userId: user.id,
      ...config
    });

    setActiveSession(newSession);
    await loadData();
    syncEngine.syncNow().catch(() => {});
  };

  const handlePauseSession = async () => {
    if (!activeSession) return;
    const paused = await focusRepo.pauseSession(activeSession.id);
    setActiveSession(paused);
    notificationService.setFocusSessionActive(false);
    await loadData();
    syncEngine.syncNow().catch(() => {});
  };

  const handleResumeSession = async () => {
    if (!activeSession) return;
    const resumed = await focusRepo.resumeSession(activeSession.id);
    setActiveSession(resumed);
    notificationService.setFocusSessionActive(true);
    await loadData();
    syncEngine.syncNow().catch(() => {});
  };

  const handleCompleteSession = async () => {
    if (!activeSession) return;
    await focusRepo.completeSession(activeSession.id);
    setActiveSession(null);
    notificationService.setFocusSessionActive(false);
    await loadData();
    syncEngine.syncNow().catch(() => {});
  };

  const handleAbandonSession = async () => {
    if (!activeSession) return;
    await focusRepo.abandonSession(activeSession.id);
    setActiveSession(null);
    notificationService.setFocusSessionActive(false);
    await loadData();
    syncEngine.syncNow().catch(() => {});
  };

  const handleIntervalComplete = async (
    completedPhase: "work" | "break" | "long_break",
    nextPhase?: "work" | "break" | "long_break",
    cycle?: number
  ) => {
    if (!activeSession) return;

    const transitioned = await focusRepo.intervalComplete(
      activeSession.id,
      completedPhase,
      nextPhase,
      cycle
    );
    setActiveSession(transitioned);

    // Trigger interval-completion notification
    const isNextWork = transitioned?.currentPhase === "work";
    const notifTitle = isNextWork ? "Break Over — Time to Focus!" : "Focus Interval Complete!";
    const notifBody = isNextWork
      ? "Get ready for your next focus work interval."
      : "Great focus! Take a well-deserved rest.";

    if (notificationService.shouldDeliverNotification(`interval_${Date.now()}`, Date.now(), { type: "focus_interval" })) {
      notificationService.scheduleLocalNotification({
        id: `interval_${Date.now()}`,
        entityId: activeSession.id,
        type: "calendar_reminder",
        title: notifTitle,
        body: notifBody,
        triggerTimestamp: Date.now() + 500
      }).catch(() => {});
    }

    await loadData();
    syncEngine.syncNow().catch(() => {});
  };

  // Compute Today's Stats
  const todayDateStr = new Date().toISOString().split("T")[0];
  const todaySessions = historySessions.filter((s) => s.startedAt.startsWith(todayDateStr));
  const todayFocusMinutes = todaySessions.reduce(
    (sum, s) => sum + (s.totalFocusMinutes || 0),
    0
  );

  return (
    <ScreenContainer
      scrollable
      includeDockPadding
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {/* Screen Header */}
      <View style={styles.header}>
        <View>
          <ThemedText variant="heading2">Pomodoro Focus</ThemedText>
          <ThemedText variant="bodySm" color={colors.inkMuted}>
            Track deep work & build focused study momentum
          </ThemedText>
        </View>
      </View>

      {/* Primary Pomodoro Timer Experience */}
      <PomodoroTimer
        session={activeSession}
        userId={user?.id || ""}
        defaultLinkedType={navLinkedType}
        defaultLinkedId={navLinkedId}
        defaultLinkedTitle={navLinkedTitle}
        dndDuringFocus={notificationService.isDndDuringFocusEnabled()}
        onStart={handleStartSession}
        onPause={handlePauseSession}
        onResume={handleResumeSession}
        onComplete={handleCompleteSession}
        onAbandon={handleAbandonSession}
        onIntervalComplete={handleIntervalComplete}
        onDndChange={(enabled) => notificationService.setDndDuringFocus(enabled)}
      />

      {/* Productivity Aggregates Grid */}
      <View style={styles.metricsGrid}>
        <Card style={styles.metricCard}>
          <View style={styles.metricIconWrap}>
            <Clock size={18} color={colors.primary} />
          </View>
          <View style={styles.metricTextWrap}>
            <ThemedText variant="heading3" style={styles.metricNumber}>
              {todayFocusMinutes}m
            </ThemedText>
            <ThemedText variant="caption" color={colors.inkMuted} numberOfLines={1}>
              Today's Focus Time
            </ThemedText>
          </View>
        </Card>

        <Card style={styles.metricCard}>
          <View style={[styles.metricIconWrap, { backgroundColor: "rgba(26, 174, 57, 0.12)" }]}>
            <Flame size={18} color={colors.accentGreen} />
          </View>
          <View style={styles.metricTextWrap}>
            <ThemedText variant="heading3" style={styles.metricNumber}>
              {todaySessions.length}
            </ThemedText>
            <ThemedText variant="caption" color={colors.inkMuted} numberOfLines={1}>
              Sessions Completed
            </ThemedText>
          </View>
        </Card>
      </View>

      {/* Focus Session History Section */}
      <View style={styles.historySection}>
        <View style={styles.historyHeader}>
          <ThemedText variant="title" style={styles.sectionTitle}>
            Session History ({historySessions.length})
          </ThemedText>
        </View>

        <SessionHistoryList
          sessions={historySessions}
          topicsMap={topicsMap}
          goalsMap={goalsMap}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.md,
    gap: spacing.lg
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  metricsGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap"
  },
  metricCard: {
    flex: 1,
    minWidth: 130,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md
  },
  metricIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: "rgba(0, 117, 222, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  metricTextWrap: {
    flex: 1,
    minWidth: 0
  },
  metricNumber: {
    color: colors.ink,
    fontWeight: "700"
  },
  historySection: {
    gap: spacing.sm
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  sectionTitle: {
    fontWeight: "700"
  }
});
