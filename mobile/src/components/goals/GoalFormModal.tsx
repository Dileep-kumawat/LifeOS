import { useState, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Plus, Trash2 } from "lucide-react-native";
import { Modal } from "../ui/Modal";
import { TextInput } from "../ui/TextInput";
import { Button } from "../ui/Button";
import { ThemedText } from "../ui/ThemedText";
import { colors, radius, spacing } from "../../theme";
import type { LocalGoal } from "../../db/schema";
import type { GoalMilestoneItem } from "../../db/repositories/goalRepo";

interface GoalFormModalProps {
  visible: boolean;
  onClose: () => void;
  goalToEdit?: LocalGoal | null;
  onSave: (goalData: {
    title: string;
    description: string;
    targetDate: string | null;
    status: "active" | "completed" | "abandoned";
    milestones: string;
  }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function GoalFormModal({
  visible,
  onClose,
  goalToEdit,
  onSave,
  onDelete
}: GoalFormModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [status, setStatus] = useState<"active" | "completed" | "abandoned">("active");
  const [milestones, setMilestones] = useState<GoalMilestoneItem[]>([]);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (goalToEdit) {
      setTitle(goalToEdit.title);
      setDescription(goalToEdit.description || "");
      setTargetDate(goalToEdit.targetDate ? goalToEdit.targetDate.split("T")[0] : "");
      setStatus(goalToEdit.status);
      try {
        setMilestones(JSON.parse(goalToEdit.milestones || "[]"));
      } catch {
        setMilestones([]);
      }
    } else {
      setTitle("");
      setDescription("");
      setTargetDate("");
      setStatus("active");
      setMilestones([]);
    }
    setNewMilestoneTitle("");
    setError(null);
  }, [goalToEdit, visible]);

  const handleAddMilestone = () => {
    if (!newMilestoneTitle.trim()) return;
    const item: GoalMilestoneItem = {
      id: "ms_" + Math.random().toString(36).substring(2, 9),
      title: newMilestoneTitle.trim(),
      completed: false,
      completedAt: null
    };
    setMilestones([...milestones, item]);
    setNewMilestoneTitle("");
  };

  const handleRemoveMilestone = (id: string) => {
    setMilestones(milestones.filter((m) => m.id !== id));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Goal title is required");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      await onSave({
        title: title.trim(),
        description: description.trim(),
        targetDate: targetDate.trim() ? `${targetDate.trim()}T00:00:00.000Z` : null,
        status,
        milestones: JSON.stringify(milestones)
      });

      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save goal");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (goalToEdit && onDelete) {
      try {
        setIsSaving(true);
        await onDelete(goalToEdit.id);
        onClose();
      } catch (err: any) {
        setError(err.message || "Failed to delete goal");
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={goalToEdit ? "Edit Goal" : "New Goal"}
      subtitle="Set milestones and measure progress"
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
          label="Goal Title"
          placeholder="e.g. Master React Native, Save $10,000"
          value={title}
          onChangeText={setTitle}
        />

        <TextInput
          label="Description"
          placeholder="Why is this goal important?"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={2}
        />

        <TextInput
          label="Target Date (YYYY-MM-DD)"
          placeholder="2026-12-31"
          value={targetDate}
          onChangeText={setTargetDate}
        />

        {/* Status Selector */}
        <View style={styles.section}>
          <ThemedText variant="caption" color={colors.inkMuted} style={styles.sectionLabel}>
            Status
          </ThemedText>
          <View style={styles.chipRow}>
            {(["active", "completed", "abandoned"] as const).map((s) => {
              const isSelected = status === s;
              return (
                <TouchableOpacity
                  key={s}
                  onPress={() => setStatus(s)}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                >
                  <ThemedText
                    variant="caption"
                    color={isSelected ? colors.onPrimary : colors.ink}
                    style={{ textTransform: "capitalize", fontWeight: "600" }}
                  >
                    {s}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Milestones Builder */}
        <View style={styles.section}>
          <ThemedText variant="caption" color={colors.inkMuted} style={styles.sectionLabel}>
            Milestones ({milestones.length})
          </ThemedText>

          {milestones.map((m) => (
            <View key={m.id} style={styles.milestoneItem}>
              <ThemedText variant="bodySm" numberOfLines={1} style={{ flex: 1 }}>
                {m.title}
              </ThemedText>
              <TouchableOpacity onPress={() => handleRemoveMilestone(m.id)}>
                <Trash2 size={16} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))}

          <View style={styles.addMilestoneRow}>
            <TextInput
              placeholder="Add next milestone..."
              value={newMilestoneTitle}
              onChangeText={setNewMilestoneTitle}
              style={{ flex: 1 }}
            />
            <TouchableOpacity onPress={handleAddMilestone} style={styles.addBtn}>
              <Plus size={18} color={colors.onPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title={isSaving ? "Saving..." : goalToEdit ? "Update Goal" : "Create Goal"}
            onPress={handleSave}
            disabled={isSaving}
          />

          {goalToEdit && onDelete && (
            <Button
              title="Delete Goal"
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
  milestoneItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.xs,
    backgroundColor: colors.canvasSoft,
    borderRadius: radius.sm,
    marginBottom: 4
  },
  addMilestoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: 4
  },
  addBtn: {
    backgroundColor: colors.primary,
    padding: spacing.sm,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center"
  },
  buttonContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.lg
  }
});
