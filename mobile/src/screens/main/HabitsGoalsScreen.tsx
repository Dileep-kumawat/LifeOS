import { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Plus, CheckSquare, Target, Flame } from "lucide-react-native";
import { ScreenContainer } from "../../components/ui/ScreenContainer";
import { ThemedText } from "../../components/ui/ThemedText";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { colors, radius, spacing } from "../../theme";
import { useAuthStore } from "../../store/authStore";
import { habitRepo } from "../../db/repositories/habitRepo";
import { goalRepo } from "../../db/repositories/goalRepo";
import { syncEngine } from "../../services/syncEngine";
import { notificationService } from "../../services/notificationService";
import type { LocalHabit, LocalHabitCheckIn, LocalGoal } from "../../db/schema";

import { HabitCard } from "../../components/habits/HabitCard";
import { HabitFormModal } from "../../components/habits/HabitFormModal";
import { GoalCard } from "../../components/goals/GoalCard";
import { GoalFormModal } from "../../components/goals/GoalFormModal";

type ActiveTab = "habits" | "goals";

export function HabitsGoalsScreen() {
  const user = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<ActiveTab>("habits");

  // Habits state
  const [habits, setHabits] = useState<LocalHabit[]>([]);
  const [todayCheckIns, setTodayCheckIns] = useState<Record<string, LocalHabitCheckIn>>({});
  const [editingHabit, setEditingHabit] = useState<LocalHabit | null>(null);
  const [isHabitModalVisible, setIsHabitModalVisible] = useState(false);

  // Goals state
  const [goals, setGoals] = useState<LocalGoal[]>([]);
  const [editingGoal, setEditingGoal] = useState<LocalGoal | null>(null);
  const [isGoalModalVisible, setIsGoalModalVisible] = useState(false);

  const todayStr = new Date().toISOString().split("T")[0];

  const loadData = useCallback(async () => {
    if (!user?.id) return;

    // Load habits & today's check-ins
    const habitList = await habitRepo.listHabits(user.id);
    setHabits(habitList);

    const checkIns = await habitRepo.getCheckInsForDate(user.id, todayStr);
    const checkInMap: Record<string, LocalHabitCheckIn> = {};
    for (const c of checkIns) {
      checkInMap[c.habitId] = c;
    }
    setTodayCheckIns(checkInMap);

    // Load goals
    const goalList = await goalRepo.listGoals(user.id);
    setGoals(goalList);
  }, [user?.id, todayStr]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Habit Actions (UC-4 Fast 1-Tap Check-in) ──────────────────────────
  const handleToggleHabitCheckIn = async (habitId: string) => {
    if (!user?.id) return;

    // Execute local-first write
    const { habit: updatedHabit, isCheckedIn, checkIn } = await habitRepo.toggleCheckIn(
      habitId,
      user.id,
      todayStr
    );

    // Optimistic UI state update
    if (updatedHabit) {
      setHabits((prev) => prev.map((h) => (h.id === habitId ? updatedHabit : h)));
    }

    setTodayCheckIns((prev) => {
      const next = { ...prev };
      if (isCheckedIn && checkIn) {
        next[habitId] = checkIn;
      } else {
        delete next[habitId];
      }
      return next;
    });

    // Background sync & notifications
    notificationService.rescheduleAllLocalNotifications(user.id).catch(() => {});
    syncEngine.syncNow().catch(() => {});
  };

  const handleSaveHabit = async (habitData: {
    title: string;
    frequency: string;
    reminderTime: string | null;
    reminderEnabled: number;
  }) => {
    if (!user?.id) return;

    if (editingHabit) {
      await habitRepo.updateHabit(editingHabit.id, habitData);
    } else {
      await habitRepo.createHabit({
        userId: user.id,
        ...habitData,
        currentStreak: 0,
        longestStreak: 0,
        completionRate: 0,
        lastCheckInDate: null
      });
    }

    await loadData();
    notificationService.rescheduleAllLocalNotifications(user.id).catch(() => {});
    syncEngine.syncNow().catch(() => {});
  };

  const handleDeleteHabit = async (id: string) => {
    if (!user?.id) return;
    await habitRepo.deleteHabit(id);
    await loadData();
    notificationService.rescheduleAllLocalNotifications(user.id).catch(() => {});
    syncEngine.syncNow().catch(() => {});
  };

  // ─── Goal Actions ────────────────────────────────────────────────────────
  const handleToggleMilestone = async (goalId: string, milestoneId: string) => {
    if (!user?.id) return;
    const { goal: updatedGoal } = await goalRepo.toggleMilestone(goalId, milestoneId);
    if (updatedGoal) {
      setGoals((prev) => prev.map((g) => (g.id === goalId ? updatedGoal : g)));
    }
    syncEngine.syncNow().catch(() => {});
  };

  const handleAddMilestonePrompt = (goalId: string) => {
    const target = goals.find((g) => g.id === goalId);
    if (target) {
      setEditingGoal(target);
      setIsGoalModalVisible(true);
    }
  };

  const handleSaveGoal = async (goalData: {
    title: string;
    description: string;
    targetDate: string | null;
    status: "active" | "completed" | "abandoned";
    milestones: string;
  }) => {
    if (!user?.id) return;

    if (editingGoal) {
      await goalRepo.updateGoal(editingGoal.id, goalData);
    } else {
      await goalRepo.createGoal({
        userId: user.id,
        ...goalData,
        progressPercent: 0,
        linkedEventIds: "[]",
        linkedNoteIds: "[]"
      });
    }

    await loadData();
    syncEngine.syncNow().catch(() => {});
  };

  const handleDeleteGoal = async (id: string) => {
    if (!user?.id) return;
    await goalRepo.deleteGoal(id);
    await loadData();
    syncEngine.syncNow().catch(() => {});
  };

  // Summary Metrics
  const habitsCompletedToday = Object.keys(todayCheckIns).length;
  const totalHabits = habits.length;
  const activeGoalsCount = goals.filter((g) => g.status === "active").length;
  const bestStreak = habits.reduce((max, h) => Math.max(max, h.currentStreak), 0);

  return (
    <ScreenContainer scrollable={false}>
      {/* Top Header */}
      <View style={styles.headerBar}>
        <ThemedText variant="heading2">Habits & Goals</ThemedText>
        <Button
          title={activeTab === "habits" ? "New Habit" : "New Goal"}
          icon={<Plus size={16} color={colors.onPrimary} />}
          onPress={() => {
            if (activeTab === "habits") {
              setEditingHabit(null);
              setIsHabitModalVisible(true);
            } else {
              setEditingGoal(null);
              setIsGoalModalVisible(true);
            }
          }}
          style={styles.addButton}
        />
      </View>

      {/* Summary Metrics Strip */}
      <View style={styles.metricsStrip}>
        <Card style={styles.metricCard}>
          <View style={styles.metricIconWrap}>
            <CheckSquare size={16} color={colors.success} />
          </View>
          <ThemedText variant="heading3">{habitsCompletedToday}/{totalHabits}</ThemedText>
          <ThemedText variant="caption" color={colors.inkMuted}>Today's Habits</ThemedText>
        </Card>

        <Card style={styles.metricCard}>
          <View style={[styles.metricIconWrap, { backgroundColor: colors.accentOrange }]}>
            <Flame size={16} color={colors.accentOrangeDeep} />
          </View>
          <ThemedText variant="heading3">{bestStreak}d</ThemedText>
          <ThemedText variant="caption" color={colors.inkMuted}>Best Streak</ThemedText>
        </Card>

        <Card style={styles.metricCard}>
          <View style={[styles.metricIconWrap, { backgroundColor: colors.accentSky }]}>
            <Target size={16} color={colors.primary} />
          </View>
          <ThemedText variant="heading3">{activeGoalsCount}</ThemedText>
          <ThemedText variant="caption" color={colors.inkMuted}>Active Goals</ThemedText>
        </Card>
      </View>

      {/* Segmented Tab Switcher */}
      <View style={styles.tabSegment}>
        <TouchableOpacity
          onPress={() => setActiveTab("habits")}
          style={[styles.segmentBtn, activeTab === "habits" && styles.segmentBtnActive]}
        >
          <ThemedText
            variant="bodySm"
            color={activeTab === "habits" ? colors.onPrimary : colors.ink}
            style={{ fontWeight: "600" }}
          >
            Habits ({habits.length})
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab("goals")}
          style={[styles.segmentBtn, activeTab === "goals" && styles.segmentBtnActive]}
        >
          <ThemedText
            variant="bodySm"
            color={activeTab === "goals" ? colors.onPrimary : colors.ink}
            style={{ fontWeight: "600" }}
          >
            Goals ({goals.length})
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Content Lists */}
      <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
        {activeTab === "habits" ? (
          habits.length === 0 ? (
            <Card style={styles.emptyCard}>
              <ThemedText variant="bodyMd" color={colors.inkMuted} style={{ textAlign: "center" }}>
                No habits yet. Tap "+ New Habit" to begin tracking routines.
              </ThemedText>
            </Card>
          ) : (
            habits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                isCheckedToday={Boolean(todayCheckIns[habit.id])}
                todayCheckIn={todayCheckIns[habit.id]}
                onToggleCheckIn={handleToggleHabitCheckIn}
                onPress={(h) => {
                  setEditingHabit(h);
                  setIsHabitModalVisible(true);
                }}
              />
            ))
          )
        ) : goals.length === 0 ? (
          <Card style={styles.emptyCard}>
            <ThemedText variant="bodyMd" color={colors.inkMuted} style={{ textAlign: "center" }}>
              No goals set. Tap "+ New Goal" to define long-term targets and milestones.
            </ThemedText>
          </Card>
        ) : (
          goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onToggleMilestone={handleToggleMilestone}
              onAddMilestonePrompt={handleAddMilestonePrompt}
              onPress={(g) => {
                setEditingGoal(g);
                setIsGoalModalVisible(true);
              }}
            />
          ))
        )}
      </ScrollView>

      {/* Habit Create / Edit Modal */}
      <HabitFormModal
        visible={isHabitModalVisible}
        onClose={() => setIsHabitModalVisible(false)}
        habitToEdit={editingHabit}
        onSave={handleSaveHabit}
        onDelete={handleDeleteHabit}
      />

      {/* Goal Create / Edit Modal */}
      <GoalFormModal
        visible={isGoalModalVisible}
        onClose={() => setIsGoalModalVisible(false)}
        goalToEdit={editingGoal}
        onSave={handleSaveGoal}
        onDelete={handleDeleteGoal}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    marginTop: spacing.xs
  },
  addButton: {
    height: 38,
    paddingHorizontal: spacing.md
  },
  metricsStrip: {
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: spacing.sm
  },
  metricCard: {
    flex: 1,
    padding: spacing.xs,
    alignItems: "center"
  },
  metricIconWrap: {
    padding: 6,
    borderRadius: radius.full,
    backgroundColor: "#D1FAE5",
    marginBottom: 2
  },
  tabSegment: {
    flexDirection: "row",
    backgroundColor: colors.canvasSoft,
    padding: 4,
    borderRadius: radius.lg,
    marginBottom: spacing.sm
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: radius.md
  },
  segmentBtnActive: {
    backgroundColor: colors.primary
  },
  listContainer: {
    flex: 1
  },
  emptyCard: {
    padding: spacing.xl,
    marginTop: spacing.md
  }
});
