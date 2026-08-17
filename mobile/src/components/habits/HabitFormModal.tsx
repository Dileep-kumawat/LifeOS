import { useState, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, Switch } from "react-native";
import { Modal } from "../ui/Modal";
import { TextInput } from "../ui/TextInput";
import { Button } from "../ui/Button";
import { ThemedText } from "../ui/ThemedText";
import { colors, radius, spacing } from "../../theme";
import type { LocalHabit } from "../../db/schema";

interface HabitFormModalProps {
  visible: boolean;
  onClose: () => void;
  habitToEdit?: LocalHabit | null;
  onSave: (habitData: {
    title: string;
    frequency: string;
    reminderTime: string | null;
    reminderEnabled: number;
  }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function HabitFormModal({
  visible,
  onClose,
  habitToEdit,
  onSave,
  onDelete
}: HabitFormModalProps) {
  const [title, setTitle] = useState("");
  const [freqType, setFreqType] = useState<"daily" | "weekly">("daily");
  const [timesPerWeek, setTimesPerWeek] = useState(3);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("08:00");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (habitToEdit) {
      setTitle(habitToEdit.title);
      try {
        const f = JSON.parse(habitToEdit.frequency || "{}");
        setFreqType(f.type === "weekly" ? "weekly" : "daily");
        setTimesPerWeek(f.timesPerPeriod || 3);
      } catch {
        setFreqType("daily");
      }
      setReminderEnabled(habitToEdit.reminderEnabled === 1);
      setReminderTime(habitToEdit.reminderTime || "08:00");
    } else {
      setTitle("");
      setFreqType("daily");
      setTimesPerWeek(3);
      setReminderEnabled(false);
      setReminderTime("08:00");
    }
    setError(null);
  }, [habitToEdit, visible]);

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Habit title is required");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const frequencyJson = JSON.stringify({
        type: freqType,
        daysOfWeek: [],
        timesPerPeriod: freqType === "weekly" ? timesPerWeek : 1
      });

      await onSave({
        title: title.trim(),
        frequency: frequencyJson,
        reminderTime: reminderEnabled ? reminderTime : null,
        reminderEnabled: reminderEnabled ? 1 : 0
      });

      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save habit");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (habitToEdit && onDelete) {
      try {
        setIsSaving(true);
        await onDelete(habitToEdit.id);
        onClose();
      } catch (err: any) {
        setError(err.message || "Failed to delete habit");
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={habitToEdit ? "Edit Habit" : "New Habit"}
      subtitle="Track your daily routines and streaks"
    >
      <View style={styles.formContainer}>
        {error && (
          <View style={styles.errorBox}>
            <ThemedText variant="caption" color={colors.error}>
              {error}
            </ThemedText>
          </View>
        )}

        <TextInput
          label="Habit Name"
          placeholder="e.g. Read 20 pages, Morning Run, Meditate"
          value={title}
          onChangeText={setTitle}
        />

        {/* Frequency selector */}
        <View style={styles.section}>
          <ThemedText variant="caption" color={colors.inkMuted} style={styles.sectionLabel}>
            Frequency
          </ThemedText>
          <View style={styles.chipRow}>
            <TouchableOpacity
              onPress={() => setFreqType("daily")}
              style={[styles.chip, freqType === "daily" && styles.chipSelected]}
            >
              <ThemedText
                variant="caption"
                color={freqType === "daily" ? colors.onPrimary : colors.ink}
                style={{ fontWeight: "600" }}
              >
                Every Day
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setFreqType("weekly")}
              style={[styles.chip, freqType === "weekly" && styles.chipSelected]}
            >
              <ThemedText
                variant="caption"
                color={freqType === "weekly" ? colors.onPrimary : colors.ink}
                style={{ fontWeight: "600" }}
              >
                Times Per Week
              </ThemedText>
            </TouchableOpacity>
          </View>

          {freqType === "weekly" && (
            <View style={styles.weeklyTargetRow}>
              {[2, 3, 4, 5].map((target) => (
                <TouchableOpacity
                  key={target}
                  onPress={() => setTimesPerWeek(target)}
                  style={[styles.targetNumBtn, timesPerWeek === target && styles.targetNumSelected]}
                >
                  <ThemedText
                    variant="bodySm"
                    color={timesPerWeek === target ? colors.onPrimary : colors.ink}
                    style={{ fontWeight: "600" }}
                  >
                    {target}x
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Daily Reminder */}
        <View style={styles.switchRow}>
          <ThemedText variant="bodyMd">Daily Reminder Notification</ThemedText>
          <Switch
            value={reminderEnabled}
            onValueChange={setReminderEnabled}
            trackColor={{ false: colors.hairline, true: colors.primary }}
          />
        </View>

        {reminderEnabled && (
          <TextInput
            label="Reminder Time (HH:MM)"
            placeholder="08:00"
            value={reminderTime}
            onChangeText={setReminderTime}
          />
        )}

        <View style={styles.buttonContainer}>
          <Button
            title={isSaving ? "Saving..." : habitToEdit ? "Update Habit" : "Create Habit"}
            onPress={handleSave}
            disabled={isSaving}
          />

          {habitToEdit && onDelete && (
            <Button
              title="Delete Habit"
              variant="outline"
              onPress={handleDelete}
              disabled={isSaving}
              style={{ marginTop: spacing.xs, borderColor: colors.error }}
              textStyle={{ color: colors.error }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    gap: spacing.sm
  },
  errorBox: {
    backgroundColor: "#FEE2E2",
    padding: spacing.sm,
    borderRadius: radius.md
  },
  section: {
    marginTop: spacing.xs
  },
  sectionLabel: {
    marginBottom: spacing.xs,
    fontWeight: "600"
  },
  chipRow: {
    flexDirection: "row",
    gap: spacing.xs
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.canvasSoft,
    borderWidth: 1,
    borderColor: colors.hairline
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  weeklyTargetRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm
  },
  targetNumBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: colors.canvasSoft,
    borderWidth: 1,
    borderColor: colors.hairline
  },
  targetNumSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.xs
  },
  buttonContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.lg
  }
});
