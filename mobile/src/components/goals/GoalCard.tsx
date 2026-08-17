import { useState } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { ChevronDown, ChevronUp, CheckSquare, Square, Calendar, Plus } from "lucide-react-native";
import { Card } from "../ui/Card";
import { ThemedText } from "../ui/ThemedText";
import { ProgressBar } from "../ui/ProgressBar";
import { SyncBadge } from "../ui/SyncBadge";
import { colors, radius, spacing } from "../../theme";
import type { LocalGoal } from "../../db/schema";
import type { GoalMilestoneItem } from "../../db/repositories/goalRepo";

interface GoalCardProps {
  goal: LocalGoal;
  onToggleMilestone: (goalId: string, milestoneId: string) => void;
  onAddMilestonePrompt: (goalId: string) => void;
  onPress: (goal: LocalGoal) => void;
}

export function GoalCard({
  goal,
  onToggleMilestone,
  onAddMilestonePrompt,
  onPress
}: GoalCardProps) {
  const [expanded, setExpanded] = useState(false);

  let milestones: GoalMilestoneItem[] = [];
  try {
    milestones = JSON.parse(goal.milestones || "[]");
  } catch {}

  const completedCount = milestones.filter((m) => m.completed).length;

  let statusBg: string = colors.canvasSoft;
  let statusFg: string = colors.inkMuted;
  if (goal.status === "completed") {
    statusBg = "#D1FAE5";
    statusFg = colors.success;
  } else if (goal.status === "active") {
    statusBg = colors.accentSky;
    statusFg = colors.primary;
  }

  const targetDateLabel = goal.targetDate
    ? new Date(goal.targetDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <Card style={styles.card}>
      <TouchableOpacity activeOpacity={0.7} onPress={() => onPress(goal)}>
        <View style={styles.headerRow}>
          <View style={styles.titleArea}>
            <ThemedText variant="heading3" numberOfLines={1}>
              {goal.title}
            </ThemedText>
            <View style={styles.tagRow}>
              <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                <ThemedText variant="caption" style={{ color: statusFg, fontWeight: "600", textTransform: "capitalize" }}>
                  {goal.status}
                </ThemedText>
              </View>
              {targetDateLabel && (
                <View style={styles.dateTag}>
                  <Calendar size={12} color={colors.inkMuted} />
                  <ThemedText variant="caption" color={colors.inkMuted}>
                    {targetDateLabel}
                  </ThemedText>
                </View>
              )}
            </View>
          </View>
          <SyncBadge status={goal.syncStatus} />
        </View>

        {Boolean(goal.description) && (
          <ThemedText variant="bodySm" color={colors.inkSecondary} numberOfLines={2} style={styles.description}>
            {goal.description}
          </ThemedText>
        )}

        {/* Progress Section */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <ThemedText variant="caption" color={colors.inkMuted}>
              {milestones.length > 0
                ? `${completedCount} of ${milestones.length} milestones (${Math.round(goal.progressPercent)}%)`
                : `${Math.round(goal.progressPercent)}% Progress`}
            </ThemedText>
          </View>
          <ProgressBar progress={goal.progressPercent} height={6} />
        </View>
      </TouchableOpacity>

      {/* Milestones Accordion Header */}
      {milestones.length > 0 && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setExpanded(!expanded)}
          style={styles.expandHeader}
        >
          <ThemedText variant="caption" color={colors.inkMuted} style={{ fontWeight: "600" }}>
            Milestones ({completedCount}/{milestones.length})
          </ThemedText>
          {expanded ? <ChevronUp size={16} color={colors.inkMuted} /> : <ChevronDown size={16} color={colors.inkMuted} />}
        </TouchableOpacity>
      )}

      {/* Milestones Checklist */}
      {expanded && (
        <View style={styles.milestonesList}>
          {milestones.map((m) => (
            <TouchableOpacity
              key={m.id}
              activeOpacity={0.7}
              onPress={() => onToggleMilestone(goal.id, m.id)}
              style={styles.milestoneRow}
            >
              {m.completed ? (
                <CheckSquare size={18} color={colors.success} />
              ) : (
                <Square size={18} color={colors.inkMuted} />
              )}
              <ThemedText
                variant="bodySm"
                color={m.completed ? colors.inkMuted : colors.ink}
                style={[styles.milestoneTitle, m.completed && styles.milestoneCompleted]}
              >
                {m.title}
              </ThemedText>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            onPress={() => onAddMilestonePrompt(goal.id)}
            style={styles.addMilestoneBtn}
          >
            <Plus size={14} color={colors.primary} />
            <ThemedText variant="caption" color={colors.primary} style={{ fontWeight: "600" }}>
              Add Milestone
            </ThemedText>
          </TouchableOpacity>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    marginBottom: spacing.sm
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between"
  },
  titleArea: {
    flex: 1,
    marginRight: spacing.sm
  },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: 4
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full
  },
  dateTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  description: {
    marginTop: spacing.xs
  },
  progressSection: {
    marginTop: spacing.sm
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4
  },
  expandHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.hairline
  },
  milestonesList: {
    marginTop: spacing.xs,
    gap: spacing.xs
  },
  milestoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: 4
  },
  milestoneTitle: {
    flex: 1
  },
  milestoneCompleted: {
    textDecorationLine: "line-through"
  },
  addMilestoneBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
    paddingVertical: 4
  }
});
