import { useEffect, useState, useCallback } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Calendar, CheckSquare, Target, DollarSign, ArrowRight, Sparkles } from "lucide-react-native";
import { useAuthStore } from "../../store/authStore";
import { useSyncStore } from "../../store/syncStore";
import { ScreenContainer } from "../../components/ui/ScreenContainer";
import { ThemedText } from "../../components/ui/ThemedText";
import { Card } from "../../components/ui/Card";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { DailySummaryCard } from "../../components/ai/DailySummaryCard";

import { aiChatService, type DailySummaryResponse } from "../../services/aiChatService";
import { eventRepo } from "../../db/repositories/eventRepo";
import { habitRepo } from "../../db/repositories/habitRepo";
import { goalRepo } from "../../db/repositories/goalRepo";
import { financeRepo } from "../../db/repositories/financeRepo";
import { colors, radius, spacing } from "../../theme";
import type { LocalEvent, LocalHabit, LocalGoal } from "../../db/schema";

export function DashboardScreen({ navigation }: any) {
  const user = useAuthStore((state) => state.user);
  const isOnline = useSyncStore((state) => state.isOnline);

  const [todayEvents, setTodayEvents] = useState<LocalEvent[]>([]);
  const [habits, setHabits] = useState<LocalHabit[]>([]);
  const [todayCheckInsCount, setTodayCheckInsCount] = useState(0);
  const [activeGoals, setActiveGoals] = useState<LocalGoal[]>([]);
  const [financeSummary, setFinanceSummary] = useState({ totalExpense: 0, totalIncome: 0 });

  // Daily Summary State
  const [dailySummaryState, setDailySummaryState] = useState<DailySummaryResponse>({
    generated: false,
    reason: null,
    deliveryTime: "07:00",
    summary: null
  });
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [isSummaryError, setIsSummaryError] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const todayStr = new Date().toISOString().split("T")[0];

  const loadDailySummary = useCallback(async () => {
    if (!isOnline) return;
    setIsSummaryLoading(true);
    setIsSummaryError(false);
    try {
      const res = await aiChatService.getTodaySummary();
      setDailySummaryState(res);
    } catch {
      setIsSummaryError(true);
    } finally {
      setIsSummaryLoading(false);
    }
  }, [isOnline]);

  const handleGenerateNow = async () => {
    if (!isOnline) return;
    setIsGeneratingSummary(true);
    try {
      const res = await aiChatService.getTodaySummary();
      setDailySummaryState(res);
    } catch {
      setIsSummaryError(true);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const loadDashboardData = useCallback(async () => {
    if (!user?.id) return;

    try {
      const allEvents = await eventRepo.listEvents(user.id);
      setTodayEvents(allEvents.filter((e) => e.startTime.startsWith(todayStr)));

      const allHabits = await habitRepo.listHabits(user.id);
      setHabits(allHabits);

      const checkIns = await habitRepo.getCheckInsForDate(user.id, todayStr);
      setTodayCheckInsCount(checkIns.length);

      const allGoals = await goalRepo.listGoals(user.id);
      setActiveGoals(allGoals.filter((g) => g.status === "active"));

      const summary = await financeRepo.getFinanceSummary(user.id);
      setFinanceSummary({
        totalExpense: summary.totalExpense,
        totalIncome: summary.totalIncome
      });
    } catch {}
  }, [user?.id, todayStr]);

  useEffect(() => {
    loadDashboardData();
    loadDailySummary();
  }, [loadDashboardData, loadDailySummary]);

  return (
    <ScreenContainer scrollable>
      {/* Greeting Header */}
      <View style={styles.header}>
        <View style={styles.greetingLeft}>
          <ThemedText variant="heading2" style={styles.greetingTitle}>
            Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, {user?.name?.split(" ")[0] || "there"}
          </ThemedText>
          <ThemedText variant="bodySm" color={colors.inkMuted} style={styles.dateSubtitle}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </ThemedText>
        </View>
      </View>

      {/* AI Daily Summary Card */}
      <View style={{ marginBottom: spacing.sm }}>
        <DailySummaryCard
          isLoading={isSummaryLoading}
          isError={isSummaryError}
          onRetry={loadDailySummary}
          generated={dailySummaryState.generated}
          deliveryTime={dailySummaryState.deliveryTime || "07:00"}
          summary={dailySummaryState.summary}
          onGenerateNow={handleGenerateNow}
          isGenerating={isGeneratingSummary}
        />
      </View>

      {/* AI Assistant Quick Launcher */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => navigation?.navigate("Assistant")}
        style={{ marginBottom: spacing.sm }}
      >
        <Card style={[styles.moduleCard, styles.aiAssistantLauncher]}>
          <View style={styles.cardHeader}>
            <View style={styles.iconTitleRow}>
              <View style={[styles.iconWrap, { backgroundColor: "#E0F2FE" }]}>
                <Sparkles size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText variant="heading3">Ask LifeOS AI</ThemedText>
                <ThemedText variant="caption" color={colors.inkMuted} numberOfLines={1}>
                  Live assistant with connected tools & insights
                </ThemedText>
              </View>
            </View>
            <ArrowRight size={16} color={colors.primary} />
          </View>
        </Card>
      </TouchableOpacity>

      {/* Quick Overview Grid */}
      <View style={styles.overviewGrid}>
        {/* Today's Schedule Card */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation?.navigate("Calendar")}
        >
          <Card style={styles.moduleCard}>
            <View style={styles.cardHeader}>
              <View style={styles.iconTitleRow}>
                <View style={[styles.iconWrap, { backgroundColor: colors.accentSky + "30" }]}>
                  <Calendar size={16} color={colors.primary} />
                </View>
                <ThemedText variant="heading3">Today's Schedule</ThemedText>
              </View>
              <ArrowRight size={16} color={colors.inkMuted} />
            </View>

            {todayEvents.length === 0 ? (
              <ThemedText variant="caption" color={colors.inkMuted} style={styles.emptyText}>
                No events scheduled for today.
              </ThemedText>
            ) : (
              todayEvents.slice(0, 3).map((ev) => (
                <View key={ev.id} style={styles.itemRow}>
                  <ThemedText variant="bodySm" numberOfLines={1} style={{ flex: 1 }}>
                    {ev.title}
                  </ThemedText>
                  <ThemedText variant="caption" color={colors.inkSecondary}>
                    {new Date(ev.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </ThemedText>
                </View>
              ))
            )}
          </Card>
        </TouchableOpacity>

        {/* Habits Progress Card */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation?.navigate("Habits & Goals")}
        >
          <Card style={styles.moduleCard}>
            <View style={styles.cardHeader}>
              <View style={styles.iconTitleRow}>
                <View style={[styles.iconWrap, { backgroundColor: "#D1FAE5" }]}>
                  <CheckSquare size={16} color={colors.accentGreen} />
                </View>
                <ThemedText variant="heading3">Habits Daily Progress</ThemedText>
              </View>
              <ArrowRight size={16} color={colors.inkMuted} />
            </View>

            <View style={styles.habitProgressRow}>
              <ThemedText variant="bodySm" color={colors.inkSecondary}>
                {todayCheckInsCount} of {habits.length} completed
              </ThemedText>
              <ThemedText variant="bodySm" style={{ fontWeight: "700", color: colors.ink }}>
                {habits.length > 0 ? Math.round((todayCheckInsCount / habits.length) * 100) : 0}%
              </ThemedText>
            </View>
            <ProgressBar
              progress={habits.length > 0 ? (todayCheckInsCount / habits.length) * 100 : 0}
              height={6}
              style={{ marginTop: 8 }}
            />
          </Card>
        </TouchableOpacity>

        {/* Active Goals Card */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation?.navigate("Habits & Goals")}
        >
          <Card style={styles.moduleCard}>
            <View style={styles.cardHeader}>
              <View style={styles.iconTitleRow}>
                <View style={[styles.iconWrap, { backgroundColor: colors.accentPurple }]}>
                  <Target size={16} color={colors.accentPurpleDeep} />
                </View>
                <ThemedText variant="heading3">Active Goals</ThemedText>
              </View>
              <ArrowRight size={16} color={colors.inkMuted} />
            </View>

            {activeGoals.length === 0 ? (
              <ThemedText variant="caption" color={colors.inkMuted} style={styles.emptyText}>
                No active goals currently set.
              </ThemedText>
            ) : (
              activeGoals.slice(0, 2).map((g) => (
                <View key={g.id} style={{ marginTop: 8 }}>
                  <View style={styles.itemRow}>
                    <ThemedText variant="bodySm" numberOfLines={1} style={{ flex: 1 }}>
                      {g.title}
                    </ThemedText>
                    <ThemedText variant="caption" style={{ fontWeight: "700", color: colors.ink }}>
                      {Math.round(g.progressPercent)}%
                    </ThemedText>
                  </View>
                  <ProgressBar progress={g.progressPercent} height={5} style={{ marginTop: 4 }} />
                </View>
              ))
            )}
          </Card>
        </TouchableOpacity>

        {/* Monthly Finance Summary Card */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation?.navigate("Finance")}
        >
          <Card style={styles.moduleCard}>
            <View style={styles.cardHeader}>
              <View style={styles.iconTitleRow}>
                <View style={[styles.iconWrap, { backgroundColor: "#FFEDD5" }]}>
                  <DollarSign size={16} color={colors.accentOrange} />
                </View>
                <ThemedText variant="heading3">Monthly Finances</ThemedText>
              </View>
              <ArrowRight size={16} color={colors.inkMuted} />
            </View>

            <View style={styles.financeRow}>
              <View>
                <ThemedText variant="caption" color={colors.inkMuted}>Total Spent</ThemedText>
                <ThemedText variant="heading3" color={colors.error} style={{ marginTop: 2 }}>
                  ${Math.round(financeSummary.totalExpense)}
                </ThemedText>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <ThemedText variant="caption" color={colors.inkMuted}>Total Income</ThemedText>
                <ThemedText variant="heading3" color={colors.accentGreen} style={{ marginTop: 2 }}>
                  +${Math.round(financeSummary.totalIncome)}
                </ThemedText>
              </View>
            </View>
          </Card>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.md,
    marginTop: spacing.xs
  },
  greetingLeft: {
    gap: 2
  },
  greetingTitle: {
    letterSpacing: -0.6
  },
  dateSubtitle: {
    fontWeight: "500"
  },
  overviewGrid: {
    gap: spacing.sm,
    paddingBottom: spacing.lg
  },
  moduleCard: {
    padding: spacing.md
  },
  aiAssistantLauncher: {
    borderColor: "#BAE6FD",
    backgroundColor: "#F0F9FF"
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs
  },
  iconTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    flex: 1
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center"
  },
  emptyText: {
    paddingVertical: spacing.xs
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4
  },
  habitProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6
  },
  financeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xs
  }
});

