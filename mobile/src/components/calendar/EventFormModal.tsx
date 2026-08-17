import { useState, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, Switch } from "react-native";
import { Modal } from "../ui/Modal";
import { TextInput } from "../ui/TextInput";
import { Button } from "../ui/Button";
import { ThemedText } from "../ui/ThemedText";
import { colors, radius, spacing } from "../../theme";
import type { LocalEvent } from "../../db/schema";
import { buildRruleString } from "@lifeos/shared";

interface EventFormModalProps {
  visible: boolean;
  onClose: () => void;
  initialDate?: Date;
  eventToEdit?: LocalEvent | null;
  onSave: (eventData: {
    title: string;
    description: string;
    location: string;
    startTime: string;
    endTime: string;
    timezone: string;
    isAllDay: number;
    recurrenceRule: string | null;
    recurrenceEndDate: string | null;
    reminderLeadMinutes: number | null;
  }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function EventFormModal({
  visible,
  onClose,
  initialDate = new Date(),
  eventToEdit,
  onSave,
  onDelete
}: EventFormModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [dateStr, setDateStr] = useState(""); // YYYY-MM-DD
  const [startTimeStr, setStartTimeStr] = useState("09:00");
  const [endTimeStr, setEndTimeStr] = useState("10:00");
  const [isAllDay, setIsAllDay] = useState(false);
  const [repeatFrequency, setRepeatFrequency] = useState<"none" | "daily" | "weekly" | "monthly">("none");
  const [reminderMinutes, setReminderMinutes] = useState<number | null>(15);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (eventToEdit) {
      setTitle(eventToEdit.title);
      setDescription(eventToEdit.description || "");
      setLocation(eventToEdit.location || "");
      const start = new Date(eventToEdit.startTime);
      const end = new Date(eventToEdit.endTime);

      setDateStr(start.toISOString().split("T")[0]);
      setStartTimeStr(start.toTimeString().substring(0, 5));
      setEndTimeStr(end.toTimeString().substring(0, 5));
      setIsAllDay(eventToEdit.isAllDay === 1);
      setReminderMinutes(eventToEdit.reminderLeadMinutes);

      if (eventToEdit.recurrenceRule?.includes("FREQ=DAILY")) {
        setRepeatFrequency("daily");
      } else if (eventToEdit.recurrenceRule?.includes("FREQ=WEEKLY")) {
        setRepeatFrequency("weekly");
      } else if (eventToEdit.recurrenceRule?.includes("FREQ=MONTHLY")) {
        setRepeatFrequency("monthly");
      } else {
        setRepeatFrequency("none");
      }
    } else {
      setTitle("");
      setDescription("");
      setLocation("");
      const targetDate = initialDate || new Date();
      setDateStr(targetDate.toISOString().split("T")[0]);
      setStartTimeStr("09:00");
      setEndTimeStr("10:00");
      setIsAllDay(false);
      setRepeatFrequency("none");
      setReminderMinutes(15);
    }
    setError(null);
  }, [eventToEdit, initialDate, visible]);

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Event title is required");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const startIso = new Date(`${dateStr}T${startTimeStr}:00`).toISOString();
      const endIso = new Date(`${dateStr}T${endTimeStr}:00`).toISOString();

      let rrule: string | null = null;
      if (repeatFrequency !== "none") {
        rrule = buildRruleString({
          frequency: repeatFrequency,
          interval: 1,
          endType: "never"
        });
      }

      await onSave({
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        startTime: startIso,
        endTime: endIso,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        isAllDay: isAllDay ? 1 : 0,
        recurrenceRule: rrule,
        recurrenceEndDate: null,
        reminderLeadMinutes: reminderMinutes
      });

      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save event");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (eventToEdit && onDelete) {
      try {
        setIsSaving(true);
        await onDelete(eventToEdit.id);
        onClose();
      } catch (err: any) {
        setError(err.message || "Failed to delete event");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const reminderOptions: Array<{ label: string; value: number | null }> = [
    { label: "None", value: null },
    { label: "5 min before", value: 5 },
    { label: "15 min before", value: 15 },
    { label: "30 min before", value: 30 },
    { label: "1 hour before", value: 60 },
    { label: "1 day before", value: 1440 }
  ];

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={eventToEdit ? "Edit Event" : "New Event"}
      subtitle="Local-first offline scheduling"
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
          label="Title"
          placeholder="e.g. Team Standup or Doctor Appointment"
          value={title}
          onChangeText={setTitle}
        />

        <TextInput
          label="Location"
          placeholder="e.g. Conference Room A or Zoom"
          value={location}
          onChangeText={setLocation}
        />

        <TextInput
          label="Date (YYYY-MM-DD)"
          placeholder="2026-08-17"
          value={dateStr}
          onChangeText={setDateStr}
        />

        {!isAllDay && (
          <View style={styles.row}>
            <View style={styles.halfCol}>
              <TextInput
                label="Start Time (HH:MM)"
                placeholder="09:00"
                value={startTimeStr}
                onChangeText={setStartTimeStr}
              />
            </View>
            <View style={styles.halfCol}>
              <TextInput
                label="End Time (HH:MM)"
                placeholder="10:00"
                value={endTimeStr}
                onChangeText={setEndTimeStr}
              />
            </View>
          </View>
        )}

        <View style={styles.switchRow}>
          <ThemedText variant="bodyMd">All-day event</ThemedText>
          <Switch
            value={isAllDay}
            onValueChange={setIsAllDay}
            trackColor={{ false: colors.hairline, true: colors.primary }}
          />
        </View>

        {/* Repeat Selector */}
        <View style={styles.section}>
          <ThemedText variant="caption" color={colors.inkMuted} style={styles.sectionLabel}>
            Repeat
          </ThemedText>
          <View style={styles.chipRow}>
            {(["none", "daily", "weekly", "monthly"] as const).map((freq) => {
              const isSelected = repeatFrequency === freq;
              return (
                <TouchableOpacity
                  key={freq}
                  onPress={() => setRepeatFrequency(freq)}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                >
                  <ThemedText
                    variant="caption"
                    color={isSelected ? colors.onPrimary : colors.ink}
                    style={{ textTransform: "capitalize", fontWeight: "600" }}
                  >
                    {freq === "none" ? "Does not repeat" : freq}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Reminder Selector */}
        <View style={styles.section}>
          <ThemedText variant="caption" color={colors.inkMuted} style={styles.sectionLabel}>
            Notification Reminder
          </ThemedText>
          <View style={styles.chipRow}>
            {reminderOptions.map((opt) => {
              const isSelected = reminderMinutes === opt.value;
              return (
                <TouchableOpacity
                  key={String(opt.value)}
                  onPress={() => setReminderMinutes(opt.value)}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                >
                  <ThemedText
                    variant="caption"
                    color={isSelected ? colors.onPrimary : colors.ink}
                    style={{ fontWeight: "600" }}
                  >
                    {opt.label}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TextInput
          label="Description / Notes"
          placeholder="Add agenda or details..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
        />

        <View style={styles.buttonContainer}>
          <Button
            title={isSaving ? "Saving..." : eventToEdit ? "Update Event" : "Create Event"}
            onPress={handleSave}
            disabled={isSaving}
          />

          {eventToEdit && onDelete && (
            <Button
              title="Delete Event"
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
  row: {
    flexDirection: "row",
    gap: spacing.sm
  },
  halfCol: {
    flex: 1
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.xs
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
    flexWrap: "wrap",
    gap: spacing.xs
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.canvasSoft,
    borderWidth: 1,
    borderColor: colors.hairline
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  buttonContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.lg
  }
});
