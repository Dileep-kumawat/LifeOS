import React from "react";
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Calendar, CheckCircle2, FileText, Target, AlertTriangle, BookOpen } from "lucide-react-native";
import type { ToolCallPayload } from "../../services/aiChatService";
import { Modal } from "../ui/Modal";
import { ThemedText } from "../ui/ThemedText";
import { colors, radius, spacing } from "../../theme";

export interface ToolConfirmationModalProps {
  visible: boolean;
  toolCall: ToolCallPayload | null;
  onConfirm: () => void;
  onCancel: () => void;
  isExecuting?: boolean;
}

export const ToolConfirmationModal: React.FC<ToolConfirmationModalProps> = ({
  visible,
  toolCall,
  onConfirm,
  onCancel,
  isExecuting = false
}) => {
  if (!toolCall) return null;

  const { toolName, args } = toolCall;

  const renderDetails = () => {
    switch (toolName) {
      case "create_calendar_event": {
        const title = args.title || "Untitled Event";
        const start = args.startTime
          ? new Date(args.startTime).toLocaleString()
          : "Unspecified start";
        const end = args.endTime ? new Date(args.endTime).toLocaleString() : "Unspecified end";
        const location = args.location || null;
        const timezone = args.timezone || "UTC";

        return {
          icon: <Calendar size={24} color={colors.primary} />,
          actionTitle: "Create Calendar Event",
          description: `Schedule "${title}" on your calendar?`,
          items: [
            { label: "Title", value: title },
            { label: "Start Time", value: start },
            { label: "End Time", value: end },
            { label: "Timezone", value: timezone },
            ...(location ? [{ label: "Location", value: location }] : []),
            ...(args.recurrenceRule ? [{ label: "Recurrence", value: args.recurrenceRule }] : [])
          ]
        };
      }

      case "create_habit": {
        const title = args.title || "Untitled Habit";
        const freq = args.frequency?.type || "daily";

        return {
          icon: <Target size={24} color={colors.success} />,
          actionTitle: "Create Habit Tracker",
          description: `Create habit tracker "${title}" (${freq})?`,
          items: [
            { label: "Habit Name", value: title },
            { label: "Frequency", value: freq },
            ...(args.reminderTime ? [{ label: "Daily Reminder", value: args.reminderTime }] : [])
          ]
        };
      }

      case "create_note": {
        const title = args.title || "Untitled Note";
        const snippet = args.content
          ? args.content.length > 100
            ? args.content.slice(0, 100) + "..."
            : args.content
          : "Empty content";

        return {
          icon: <FileText size={24} color={colors.accentPurpleDeep} />,
          actionTitle: "Create Notebook Note",
          description: `Create new note "${title}" in your notebook?`,
          items: [
            { label: "Title", value: title },
            { label: "Content Preview", value: snippet },
            ...(args.tags?.length ? [{ label: "Tags", value: args.tags.join(", ") }] : [])
          ]
        };
      }

      case "generate_study_plan":
      case "create_study_plan": {
        const targetDate = args.targetDate || "tomorrow";
        const plan = Array.isArray(args.plan) ? args.plan : Array.isArray(args.assignments) ? args.assignments : [];
        const count = plan.length;
        const totalMins = args.totalStudyMinutes || plan.reduce((sum: number, p: any) => sum + (p.durationMinutes || 0), 0);

        return {
          icon: <BookOpen size={24} color={colors.primary} />,
          actionTitle: "Apply AI Study Plan",
          description: `Schedule ${count} study session(s) (${totalMins} min) for ${targetDate}?`,
          items: [
            { label: "Target Date", value: targetDate },
            { label: "Total Sessions", value: `${count} study session(s)` },
            { label: "Total Duration", value: `${totalMins} minutes` },
            ...plan.map((s: any, idx: number) => {
              const start = s.startTime
                ? new Date(s.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "";
              const end = s.endTime
                ? new Date(s.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "";
              return {
                label: `Session ${idx + 1}: ${s.topicTitle || "Study Topic"}`,
                value: `${start} – ${end} (${s.durationMinutes || 45}m)`
              };
            })
          ]
        };
      }

      default:
        return {
          icon: <AlertTriangle size={24} color={colors.warning} />,
          actionTitle: `Execute Action: ${toolName}`,
          description: "Confirm proposed tool action with parameters below?",
          items: Object.entries(args || {}).map(([k, v]) => ({
            label: k,
            value: typeof v === "object" ? JSON.stringify(v) : String(v)
          }))
        };
    }
  };

  const details = renderDetails();

  return (
    <Modal
      visible={visible}
      onClose={isExecuting ? () => {} : onCancel}
      title={details.actionTitle}
      subtitle="User action confirmation required (FR-2.4)"
      scrollable
    >
      <View style={styles.container}>
        <View style={styles.iconRow}>
          <View style={styles.iconWrap}>{details.icon}</View>
          <ThemedText variant="bodyMd" style={styles.descText}>
            {details.description}
          </ThemedText>
        </View>

        {/* Parameters Box */}
        <View style={styles.paramsBox}>
          {details.items.map((item, idx) => (
            <View key={idx} style={styles.paramRow}>
              <ThemedText variant="caption" color={colors.inkMuted} style={styles.paramLabel}>
                {item.label}
              </ThemedText>
              <ThemedText variant="bodySm" style={styles.paramValue}>
                {item.value}
              </ThemedText>
            </View>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onCancel}
            disabled={isExecuting}
            style={[styles.cancelBtn, isExecuting && { opacity: 0.5 }]}
          >
            <ThemedText variant="bodySm" style={styles.cancelBtnText}>
              Cancel Action
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onConfirm}
            disabled={isExecuting}
            style={[styles.confirmBtn, isExecuting && { opacity: 0.7 }]}
          >
            {isExecuting ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <CheckCircle2 size={16} color={colors.onPrimary} />
            )}
            <ThemedText variant="bodySm" style={styles.confirmBtnText}>
              {isExecuting ? "Executing..." : "Confirm & Execute"}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.md
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  iconWrap: {
    padding: spacing.xs,
    backgroundColor: colors.canvasSoft,
    borderRadius: radius.md
  },
  descText: {
    flex: 1,
    fontWeight: "600",
    color: colors.ink
  },
  paramsBox: {
    backgroundColor: colors.canvasSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    gap: spacing.xs
  },
  paramRow: {
    flexDirection: "column",
    gap: 2
  },
  paramLabel: {
    fontWeight: "700",
    textTransform: "uppercase"
  },
  paramValue: {
    color: colors.ink,
    fontWeight: "500"
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center"
  },
  cancelBtnText: {
    color: colors.ink,
    fontWeight: "600"
  },
  confirmBtn: {
    flex: 1.5,
    flexDirection: "row",
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs
  },
  confirmBtnText: {
    color: colors.onPrimary,
    fontWeight: "700"
  }
});
