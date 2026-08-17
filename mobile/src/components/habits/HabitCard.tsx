import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Flame, Check, Bell } from "lucide-react-native";
import { Card } from "../ui/Card";
import { ThemedText } from "../ui/ThemedText";
import { SyncBadge } from "../ui/SyncBadge";
import { colors, radius, spacing } from "../../theme";
import type { LocalHabit, LocalHabitCheckIn } from "../../db/schema";

interface HabitCardProps {
  habit: LocalHabit;
  isCheckedToday: boolean;
  todayCheckIn?: LocalHabitCheckIn;
  onToggleCheckIn: (habitId: string) => void;
  onPress: (habit: LocalHabit) => void;
}

export function HabitCard({
  habit,
  isCheckedToday,
  todayCheckIn,
  onToggleCheckIn,
  onPress
}: HabitCardProps) {
  let freqLabel = "Daily";
  try {
    const f = JSON.parse(habit.frequency || "{}");
    if (f.type === "weekly") {
      freqLabel = `${f.timesPerPeriod || 1}x / week`;
    } else if (f.type === "custom" && f.daysOfWeek?.length) {
      freqLabel = `${f.daysOfWeek.length} days/week`;
    }
  } catch {}

  // The check-in sync status takes priority if pending offline
  const checkInSyncStatus = todayCheckIn?.syncStatus;
  const displaySyncStatus = checkInSyncStatus === "pending" ? "pending" : habit.syncStatus;

  return (
    <Card style={styles.card}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onPress(habit)}
        style={styles.mainClickable}
      >
        <View style={styles.contentColumn}>
          <View style={styles.headerRow}>
            <ThemedText variant="heading3" numberOfLines={1} style={styles.title}>
              {habit.title}
            </ThemedText>
            <SyncBadge status={displaySyncStatus} />
          </View>

          <View style={styles.metaRow}>
            <View style={styles.frequencyTag}>
              <ThemedText variant="caption" color={colors.inkMuted} style={{ fontSize: 11 }}>
                {freqLabel}
              </ThemedText>
            </View>

            {Boolean(habit.reminderEnabled && habit.reminderTime) && (
              <View style={styles.reminderTag}>
                <Bell size={11} color={colors.accentPurpleDeep} />
                <ThemedText variant="caption" color={colors.accentPurpleDeep} style={{ fontSize: 11 }}>
                  {habit.reminderTime}
                </ThemedText>
              </View>
            )}

            {/* Streak Badge */}
            <View style={[styles.streakBadge, habit.currentStreak > 0 && styles.streakBadgeActive]}>
              <Flame
                size={13}
                color={habit.currentStreak > 0 ? colors.accentOrangeDeep : colors.inkMuted}
              />
              <ThemedText
                variant="caption"
                color={habit.currentStreak > 0 ? colors.accentOrangeDeep : colors.inkMuted}
                style={{ fontWeight: "700", fontSize: 12 }}
              >
                {habit.currentStreak} {habit.currentStreak === 1 ? "day" : "days"}
              </ThemedText>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* 1-Tap Check-In Button (UC-4 Fast Tap) */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onToggleCheckIn(habit.id)}
        style={[styles.checkButton, isCheckedToday && styles.checkButtonActive]}
      >
        {isCheckedToday && <Check size={20} color={colors.onPrimary} strokeWidth={3} />}
      </TouchableOpacity>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    marginBottom: spacing.sm,
    justifyContent: "space-between"
  },
  mainClickable: {
    flex: 1,
    marginRight: spacing.md
  },
  contentColumn: {
    gap: 4
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  title: {
    flex: 1,
    marginRight: spacing.xs
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4
  },
  frequencyTag: {
    backgroundColor: colors.canvasSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.xs
  },
  reminderTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.accentPurple,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.canvasSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full
  },
  streakBadgeActive: {
    backgroundColor: colors.accentOrange
  },
  checkButton: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.hairline,
    backgroundColor: colors.canvasSoft,
    alignItems: "center",
    justifyContent: "center"
  },
  checkButtonActive: {
    backgroundColor: colors.success,
    borderColor: colors.success
  }
});
