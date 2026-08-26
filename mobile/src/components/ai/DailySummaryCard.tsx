import React from "react";
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import {
  Sparkles,
  CheckCircle2,
  Clock,
  RefreshCw,
  AlertCircle,
  Calendar
} from "lucide-react-native";
import type { DailySummary } from "@lifeos/shared";
import { Card } from "../ui/Card";
import { ThemedText } from "../ui/ThemedText";
import { colors, radius, spacing } from "../../theme";

export interface DailySummaryCardProps {
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  generated?: boolean;
  deliveryTime?: string;
  summary?: DailySummary | null;
  onGenerateNow?: () => void;
  isGenerating?: boolean;
}

export const DailySummaryCard: React.FC<DailySummaryCardProps> = ({
  isLoading = false,
  isError = false,
  onRetry,
  generated = true,
  deliveryTime = "07:00",
  summary,
  onGenerateNow,
  isGenerating = false
}) => {
  // 1. Loading State
  if (isLoading) {
    return (
      <Card style={styles.card}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <ThemedText variant="caption" color={colors.inkMuted}>
            Loading today's AI summary...
          </ThemedText>
        </View>
      </Card>
    );
  }

  // 2. Error State
  if (isError) {
    return (
      <Card style={[styles.card, styles.errorCard]}>
        <View style={styles.errorHeader}>
          <View style={styles.errorIconWrap}>
            <AlertCircle size={16} color={colors.error} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText variant="bodySm" style={styles.errorTitle}>
              Could not load daily summary
            </ThemedText>
            <ThemedText variant="caption" color={colors.inkMuted}>
              An error occurred fetching today's summary.
            </ThemedText>
          </View>
          {onRetry && (
            <TouchableOpacity activeOpacity={0.7} onPress={onRetry} style={styles.retryBtn}>
              <RefreshCw size={12} color={colors.ink} />
              <ThemedText variant="caption" style={styles.retryBtnText}>
                Retry
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    );
  }

  // 3. Not Yet Generated State (Scheduled)
  if (!generated || !summary) {
    return (
      <Card style={[styles.card, styles.scheduledCard]}>
        <View style={styles.scheduledHeader}>
          <View style={styles.sparklesWrap}>
            <Sparkles size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.titleBadgeRow}>
              <ThemedText variant="heading3" style={styles.scheduledTitle}>
                Daily Summary
              </ThemedText>
              <View style={styles.scheduledBadge}>
                <ThemedText variant="caption" style={styles.scheduledBadgeText}>
                  Scheduled
                </ThemedText>
              </View>
            </View>
            <ThemedText variant="caption" color={colors.inkMuted} style={{ marginTop: 2 }}>
              Your AI Daily Summary will be generated at{" "}
              <ThemedText variant="caption" style={{ fontWeight: "700", color: colors.ink }}>
                {deliveryTime}
              </ThemedText>
              .
            </ThemedText>
          </View>
        </View>

        {onGenerateNow && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onGenerateNow}
            disabled={isGenerating}
            style={[styles.generateNowBtn, isGenerating && { opacity: 0.7 }]}
          >
            {isGenerating ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <RefreshCw size={14} color={colors.onPrimary} />
            )}
            <ThemedText variant="caption" style={styles.generateNowBtnText}>
              {isGenerating ? "Generating..." : "Generate Now"}
            </ThemedText>
          </TouchableOpacity>
        )}
      </Card>
    );
  }

  const { yesterdayCompleted = [], todaySchedule = [], topPriorities = [], date } = summary;

  return (
    <Card style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <View style={styles.sparklesWrap}>
            <Sparkles size={16} color={colors.primary} />
          </View>
          <ThemedText variant="heading3">Daily Summary</ThemedText>
        </View>
        <View style={styles.dateBadge}>
          <Clock size={12} color={colors.primary} />
          <ThemedText variant="caption" style={styles.dateBadgeText}>
            {date || "Today"}
          </ThemedText>
        </View>
      </View>

      {/* Top 3 Priorities Section */}
      <View style={styles.section}>
        <ThemedText variant="caption" style={styles.sectionHeading}>
          Top 3 Priorities
        </ThemedText>
        {topPriorities.length === 0 ? (
          <ThemedText variant="caption" color={colors.inkMuted} style={styles.sparseText}>
            No specific priorities set for today.
          </ThemedText>
        ) : (
          <View style={styles.prioritiesList}>
            {topPriorities.slice(0, 3).map((p, idx) => (
              <View key={idx} style={styles.priorityRow}>
                <View style={styles.priorityRankBadge}>
                  <ThemedText variant="caption" style={styles.priorityRankNum}>
                    {idx + 1}
                  </ThemedText>
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="bodySm" numberOfLines={1} style={styles.priorityTitle}>
                    {p.title}
                  </ThemedText>
                  {p.rationale ? (
                    <ThemedText variant="caption" color={colors.inkMuted} numberOfLines={1}>
                      {p.rationale}
                    </ThemedText>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Grid: Yesterday's Wins & Today's Schedule Glance */}
      <View style={styles.twoColumnGrid}>
        {/* Yesterday's Wins */}
        <View style={styles.subCard}>
          <ThemedText variant="caption" style={styles.sectionHeading}>
            Yesterday's Wins
          </ThemedText>
          {yesterdayCompleted.length === 0 ? (
            <ThemedText variant="caption" color={colors.inkMuted} style={styles.sparseText}>
              No completed habits recorded yesterday.
            </ThemedText>
          ) : (
            <View style={styles.itemsList}>
              {yesterdayCompleted.slice(0, 3).map((item, idx) => (
                <View key={idx} style={styles.itemLine}>
                  <CheckCircle2 size={13} color={colors.success} style={{ marginTop: 2 }} />
                  <ThemedText variant="caption" numberOfLines={1} style={{ flex: 1 }}>
                    {item.title}
                  </ThemedText>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Today's Schedule Glance */}
        <View style={styles.subCard}>
          <ThemedText variant="caption" style={styles.sectionHeading}>
            Today's Flow
          </ThemedText>
          {todaySchedule.length === 0 ? (
            <ThemedText variant="caption" color={colors.inkMuted} style={styles.sparseText}>
              No calendar events scheduled for today.
            </ThemedText>
          ) : (
            <View style={styles.itemsList}>
              {todaySchedule.slice(0, 3).map((evt, idx) => {
                const timeStr = evt.isAllDay
                  ? "All Day"
                  : new Date(evt.startTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit"
                    });

                return (
                  <View key={idx} style={styles.itemLine}>
                    <Calendar size={13} color={colors.primary} style={{ marginTop: 2 }} />
                    <ThemedText variant="caption" numberOfLines={1} style={{ flex: 1 }}>
                      {evt.title}
                    </ThemedText>
                    <ThemedText variant="caption" color={colors.inkMuted} style={styles.timeTag}>
                      {timeStr}
                    </ThemedText>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    gap: spacing.sm
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md
  },
  errorCard: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA"
  },
  errorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  errorIconWrap: {
    padding: 6,
    backgroundColor: "#FEE2E2",
    borderRadius: radius.full
  },
  errorTitle: {
    fontWeight: "700",
    color: colors.error
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.hairline
  },
  retryBtnText: {
    fontWeight: "600"
  },
  scheduledCard: {
    backgroundColor: colors.surface
  },
  scheduledHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  sparklesWrap: {
    padding: 6,
    backgroundColor: "#E0F2FE",
    borderRadius: radius.md
  },
  titleBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 6
  },
  scheduledTitle: {
    flexShrink: 1
  },
  scheduledBadge: {
    backgroundColor: colors.canvasSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.hairline,
    flexShrink: 0
  },
  scheduledBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.inkSecondary
  },
  generateNowBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: radius.full,
    marginTop: 6
  },
  generateNowBtnText: {
    color: colors.onPrimary,
    fontWeight: "600",
    fontSize: 14
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2
  },
  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full
  },
  dateBadgeText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 11
  },
  section: {
    gap: 6
  },
  sectionHeading: {
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: colors.inkMuted,
    fontSize: 10.5
  },
  sparseText: {
    fontStyle: "italic",
    paddingVertical: 2
  },
  prioritiesList: {
    gap: 6
  },
  priorityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    backgroundColor: colors.canvasSoft,
    padding: spacing.xs,
    borderRadius: radius.md
  },
  priorityRankBadge: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  priorityRankNum: {
    color: colors.onPrimary,
    fontWeight: "700",
    fontSize: 11
  },
  priorityTitle: {
    fontWeight: "600",
    color: colors.ink
  },
  twoColumnGrid: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: 2
  },
  subCard: {
    flex: 1,
    backgroundColor: colors.canvasSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.xs + 2,
    gap: 6
  },
  itemsList: {
    gap: 4
  },
  itemLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  timeTag: {
    fontSize: 10.5,
    fontFamily: "monospace",
    color: colors.inkMuted
  }
});
