import { View, StyleSheet } from "react-native";
import {
  Timer,
  CheckSquare,
  Flame,
  Target,
  BookOpen,
  Activity,
  Award
} from "lucide-react-native";
import { ThemedText } from "../ui/ThemedText";
import { Card } from "../ui/Card";
import { ProgressBar } from "../ui/ProgressBar";
import { AnalyticsChart } from "./AnalyticsChart";
import type { ProductivityAnalytics } from "@lifeos/shared";
import { colors, spacing, radius } from "../../theme";

interface ProductivityAnalyticsViewProps {
  data?: ProductivityAnalytics;
  isLoading?: boolean;
}

export function ProductivityAnalyticsView({
  data,
  isLoading = false
}: ProductivityAnalyticsViewProps) {
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <AnalyticsChart
          xKey="date"
          series={[{ dataKey: "focusMinutes", name: "Focus", color: colors.primary }]}
          isLoading={true}
        />
      </View>
    );
  }

  const hasData =
    data &&
    (data.habits.totalExpected > 0 ||
      data.focus.totalSessionsCount > 0 ||
      data.habitConsistency.length > 0 ||
      data.trend.some((t) => t.focusMinutes > 0 || t.habitsCompleted > 0));

  if (!data || !hasData) {
    return (
      <Card style={styles.emptyCard}>
        <View style={styles.emptyIconWrap}>
          <Activity size={28} color={colors.primary} />
        </View>
        <ThemedText variant="heading3" style={{ marginBottom: 4 }}>
          No Productivity Data
        </ThemedText>
        <ThemedText variant="caption" color={colors.inkMuted} style={styles.emptyText}>
          Track your daily habits, run a Pomodoro focus timer session, or adjust your selected date range
          to see trends.
        </ThemedText>
      </Card>
    );
  }

  const totalMinutes = data.focus.totalFocusMinutes || 0;
  const hours = Math.floor(totalMinutes / 60);
  const remainingMins = totalMinutes % 60;
  const formattedFocusTime =
    hours > 0 ? `${hours}h ${remainingMins}m` : `${remainingMins}m`;

  const habitRatePercent = Math.round((data.habits.completionRate || 0) * 100);

  const getLinkedTypeIcon = (type: string) => {
    switch (type) {
      case "topic":
        return <BookOpen size={14} color={colors.primary} />;
      case "goal":
        return <Target size={14} color="#8B5CF6" />;
      default:
        return <Timer size={14} color={colors.inkMuted} />;
    }
  };

  const getLinkedTypeLabel = (type: string) => {
    switch (type) {
      case "topic":
        return "Study Topics";
      case "goal":
        return "Key Goals";
      case "task":
        return "Tasks";
      default:
        return "General Focus";
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. KPI 2x2 Grid */}
      <View style={styles.kpiGrid}>
        {/* Focus Time */}
        <Card style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <ThemedText variant="caption" style={styles.kpiLabel}>
              Focus Time
            </ThemedText>
            <View style={[styles.kpiIconWrap, { backgroundColor: "rgba(0, 117, 222, 0.1)" }]}>
              <Timer size={14} color={colors.primary} />
            </View>
          </View>
          <ThemedText variant="heading2" style={styles.kpiValue}>
            {formattedFocusTime}
          </ThemedText>
          <ThemedText variant="caption" color={colors.inkMuted} style={styles.kpiSub}>
            {data.focus.completedSessionsCount} sessions (avg {Math.round(data.focus.averageSessionMinutes)}m)
          </ThemedText>
        </Card>

        {/* Habits Consistency */}
        <Card style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <ThemedText variant="caption" style={styles.kpiLabel}>
              Habits Done
            </ThemedText>
            <View style={[styles.kpiIconWrap, { backgroundColor: "rgba(26, 174, 57, 0.1)" }]}>
              <CheckSquare size={14} color={colors.success} />
            </View>
          </View>
          <ThemedText variant="heading2" style={styles.kpiValue}>
            {habitRatePercent}%
          </ThemedText>
          <ThemedText variant="caption" color={colors.inkMuted} style={styles.kpiSub}>
            {data.habits.totalCompleted} of {data.habits.totalExpected} completed
          </ThemedText>
        </Card>

        {/* Active Habits Count */}
        <Card style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <ThemedText variant="caption" style={styles.kpiLabel}>
              Active Habits
            </ThemedText>
            <View style={[styles.kpiIconWrap, { backgroundColor: "rgba(245, 158, 11, 0.1)" }]}>
              <Flame size={14} color="#F59E0B" />
            </View>
          </View>
          <ThemedText variant="heading2" style={styles.kpiValue}>
            {data.habitConsistency.length}
          </ThemedText>
          <ThemedText variant="caption" color={colors.inkMuted} style={styles.kpiSub}>
            Max streak: {Math.max(...data.habitConsistency.map((h) => h.longestStreak), 0)}d
          </ThemedText>
        </Card>

        {/* Focus Sessions */}
        <Card style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <ThemedText variant="caption" style={styles.kpiLabel}>
              Total Sessions
            </ThemedText>
            <View style={[styles.kpiIconWrap, { backgroundColor: "rgba(139, 92, 246, 0.1)" }]}>
              <Target size={14} color="#8B5CF6" />
            </View>
          </View>
          <ThemedText variant="heading2" style={styles.kpiValue}>
            {data.focus.totalSessionsCount}
          </ThemedText>
          <ThemedText variant="caption" color={colors.inkMuted} style={styles.kpiSub}>
            {data.focus.abandonedSessionsCount} abandoned early
          </ThemedText>
        </Card>
      </View>

      {/* 2. Daily Trend Chart */}
      <AnalyticsChart
        type="bar"
        title="Daily Productivity Trend"
        subtitle="Focus minutes & completed habits"
        xKey="date"
        series={[
          { dataKey: "focusMinutes", name: "Focus (min)", color: colors.primary },
          { dataKey: "habitsCompleted", name: "Habits", color: colors.success }
        ]}
        data={data.trend}
        xAxisFormatter={(val: string) => {
          if (!val) return "";
          const parts = val.split("-");
          if (parts.length === 3) return `${parts[1]}/${parts[2]}`;
          return val;
        }}
      />

      {/* 3. Focus Category Distribution Card */}
      {data.focus.linkedTypeBreakdown.length > 0 && (
        <Card style={styles.sectionCard}>
          <ThemedText variant="heading3" style={{ marginBottom: 2 }}>
            Focus Distribution
          </ThemedText>
          <ThemedText variant="caption" color={colors.inkMuted} style={{ marginBottom: 12 }}>
            Time breakdown by linked objective
          </ThemedText>

          <View style={styles.distributionList}>
            {data.focus.linkedTypeBreakdown.map((item) => (
              <View key={item.linkedType} style={styles.distributionItem}>
                <View style={styles.distHeaderRow}>
                  <View style={styles.distTitleWrap}>
                    {getLinkedTypeIcon(item.linkedType)}
                    <ThemedText variant="caption" style={styles.distTitleText}>
                      {getLinkedTypeLabel(item.linkedType)}
                    </ThemedText>
                  </View>
                  <ThemedText variant="caption" style={{ fontWeight: "700" }}>
                    {item.totalMinutes}m ({item.percentage}%)
                  </ThemedText>
                </View>
                <ProgressBar
                  progress={item.percentage}
                  height={6}
                  color={colors.primary}
                  backgroundColor={colors.hairline}
                />
              </View>
            ))}
          </View>
        </Card>
      )}

      {/* 4. Habit Consistency & Streaks List */}
      <Card style={styles.sectionCard}>
        <View style={styles.distHeaderRow}>
          <ThemedText variant="heading3">Habit Streaks & Consistency</ThemedText>
          <Award size={16} color="#F59E0B" />
        </View>

        {data.habitConsistency.length === 0 ? (
          <ThemedText
            variant="caption"
            color={colors.inkMuted}
            style={{ textAlign: "center", paddingVertical: spacing.md }}
          >
            No active habits in this range.
          </ThemedText>
        ) : (
          <View style={styles.habitsList}>
            {data.habitConsistency.map((habit) => {
              const rate = Math.round(habit.rangeCompletionRate * 100);
              return (
                <View key={habit.habitId} style={styles.habitRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <ThemedText variant="bodySm" style={{ fontWeight: "700" }} numberOfLines={1}>
                      {habit.title}
                    </ThemedText>
                    <ThemedText variant="caption" color={colors.inkMuted} style={{ fontSize: 11 }}>
                      {habit.rangeCompleted} of {habit.rangeExpected} days completed
                    </ThemedText>
                  </View>

                  <View style={styles.habitStreakBadge}>
                    <Flame size={13} color="#F59E0B" />
                    <ThemedText variant="caption" style={styles.streakText}>
                      {habit.currentStreak}d
                    </ThemedText>
                  </View>

                  <View
                    style={[
                      styles.ratePill,
                      rate >= 80 ? styles.ratePillHigh : styles.ratePillMid
                    ]}
                  >
                    <ThemedText
                      variant="caption"
                      style={[
                        styles.rateText,
                        rate >= 80 ? styles.rateTextHigh : styles.rateTextMid
                      ]}
                    >
                      {rate}%
                    </ThemedText>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm
  },
  loadingContainer: {
    padding: spacing.md
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: spacing.md
  },
  emptyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.canvasSoft,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm
  },
  emptyText: {
    textAlign: "center",
    maxWidth: 280
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  kpiCard: {
    flex: 1,
    minWidth: "47%",
    padding: spacing.sm,
    marginBottom: 0
  },
  kpiHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4
  },
  kpiLabel: {
    fontSize: 10.5,
    fontWeight: "600",
    color: colors.inkMuted,
    textTransform: "uppercase"
  },
  kpiIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center"
  },
  kpiValue: {
    fontWeight: "700",
    fontSize: 18,
    color: colors.ink
  },
  kpiSub: {
    fontSize: 10.5,
    marginTop: 2
  },
  sectionCard: {
    padding: spacing.md,
    marginBottom: spacing.xs
  },
  distributionList: {
    gap: 10
  },
  distributionItem: {
    gap: 4
  },
  distHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4
  },
  distTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  distTitleText: {
    fontWeight: "600",
    color: colors.ink
  },
  habitsList: {
    gap: spacing.xs,
    marginTop: spacing.xs
  },
  habitRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline
  },
  habitStreakBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
    gap: 2,
    marginRight: 8
  },
  streakText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#F59E0B"
  },
  ratePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full
  },
  ratePillHigh: {
    backgroundColor: "rgba(16, 185, 129, 0.1)"
  },
  ratePillMid: {
    backgroundColor: "rgba(245, 158, 11, 0.1)"
  },
  rateText: {
    fontSize: 10.5,
    fontWeight: "700"
  },
  rateTextHigh: {
    color: colors.success
  },
  rateTextMid: {
    color: "#F59E0B"
  }
});
