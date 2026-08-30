import React from "react";
import { View, StyleSheet } from "react-native";
import { CheckCircle2, XCircle, Timer } from "lucide-react-native";
import { Card } from "../ui/Card";
import { ThemedText } from "../ui/ThemedText";
import { colors, radius, spacing, shadows } from "../../theme";
import type { LocalFocusSession, LocalTopic, LocalGoal } from "../../db/schema";

export interface SessionHistoryListProps {
  sessions: LocalFocusSession[];
  topicsMap?: Record<string, LocalTopic>;
  goalsMap?: Record<string, LocalGoal>;
}

export const SessionHistoryList: React.FC<SessionHistoryListProps> = ({
  sessions,
  topicsMap = {},
  goalsMap = {}
}) => {
  if (sessions.length === 0) {
    return (
      <Card style={styles.emptyCard}>
        <Timer size={32} color={colors.inkMuted} style={styles.emptyIcon} />
        <ThemedText variant="title" style={styles.emptyTitle}>
          No Focus History Yet
        </ThemedText>
        <ThemedText variant="bodySm" color={colors.inkMuted} style={styles.emptySubtitle}>
          Complete your first Pomodoro session above to track your productivity trends and study aggregates.
        </ThemedText>
      </Card>
    );
  }

  const formatSessionTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const formatSessionDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString([], { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  return (
    <View style={styles.container}>
      {sessions.map((s) => {
        const isCompleted = s.status === "completed";
        const topic = s.linkedType === "topic" && s.linkedId ? topicsMap[s.linkedId] : null;
        const goal = s.linkedType === "goal" && s.linkedId ? goalsMap[s.linkedId] : null;

        return (
          <View key={s.id} style={[styles.sessionRow, shadows.card]}>
            {/* Status Icon */}
            <View
              style={[
                styles.statusIconWrap,
                {
                  backgroundColor: isCompleted
                    ? "rgba(26, 174, 57, 0.12)"
                    : "rgba(225, 29, 72, 0.12)"
                }
              ]}
            >
              {isCompleted ? (
                <CheckCircle2 size={18} color={colors.accentGreen} />
              ) : (
                <XCircle size={18} color={colors.error} />
              )}
            </View>

            {/* Session Info */}
            <View style={styles.sessionInfo}>
              <View style={styles.titleRow}>
                <ThemedText
                  variant="bodySm"
                  style={styles.sessionTitle}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {topic
                    ? topic.title
                    : goal
                      ? goal.title
                      : `${s.workMinutes}m Focus Session`}
                </ThemedText>
                <ThemedText variant="bodySm" style={styles.focusMinutesText}>
                  +{s.totalFocusMinutes} mins
                </ThemedText>
              </View>

              <View style={styles.metaRow}>
                <ThemedText variant="caption" color={colors.inkFaint}>
                  {formatSessionDate(s.startedAt)} at {formatSessionTime(s.startedAt)}
                </ThemedText>
                <ThemedText variant="caption" color={colors.inkFaint}>
                  •
                </ThemedText>
                <ThemedText variant="caption" color={colors.inkFaint}>
                  {s.currentCycle} cycle{s.currentCycle !== 1 ? "s" : ""}
                </ThemedText>
                {s.linkedType !== "none" && (
                  <>
                    <ThemedText variant="caption" color={colors.inkFaint}>
                      •
                    </ThemedText>
                    <ThemedText variant="caption" color={colors.primary} style={styles.linkedTag}>
                      {s.linkedType.toUpperCase()}
                    </ThemedText>
                  </>
                )}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs
  },
  emptyIcon: {
    marginBottom: spacing.xs
  },
  emptyTitle: {
    fontWeight: "700",
    color: colors.ink
  },
  emptySubtitle: {
    textAlign: "center",
    lineHeight: 20
  },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    gap: spacing.sm
  },
  statusIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center"
  },
  sessionInfo: {
    flex: 1,
    gap: 3
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.xs
  },
  sessionTitle: {
    fontWeight: "700",
    color: colors.ink,
    flex: 1,
    minWidth: 0,
    marginRight: spacing.xs
  },
  focusMinutesText: {
    fontWeight: "700",
    color: colors.primary,
    flexShrink: 0
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4
  },
  linkedTag: {
    fontWeight: "700",
    fontSize: 10
  }
});
