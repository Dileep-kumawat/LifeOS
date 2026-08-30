import React, { useState, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, Alert, ScrollView } from "react-native";
import { Trash2 } from "lucide-react-native";
import { Modal } from "../ui/Modal";
import { TextInput } from "../ui/TextInput";
import { Button } from "../ui/Button";
import { ThemedText } from "../ui/ThemedText";
import { colors, radius, spacing } from "../../theme";
import type { LocalTopic, LocalSubject } from "../../db/schema";

export interface TopicModalProps {
  visible: boolean;
  onClose: () => void;
  topic?: LocalTopic | null;
  subjects: LocalSubject[];
  defaultSubjectId?: string | null;
  onSave: (data: {
    title: string;
    subjectId: string;
    deadline: string | null;
    priority: "low" | "medium" | "high";
    status: "not_started" | "in_progress" | "completed";
    estimatedMinutes: number | null;
  }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export const TopicModal: React.FC<TopicModalProps> = ({
  visible,
  onClose,
  topic,
  subjects,
  defaultSubjectId,
  onSave,
  onDelete
}) => {
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [status, setStatus] = useState<"not_started" | "in_progress" | "completed">("not_started");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (topic) {
      setTitle(topic.title);
      setSubjectId(topic.subjectId);
      setDeadline(topic.deadline ? topic.deadline.split("T")[0] : "");
      setPriority(topic.priority || "medium");
      setStatus(topic.status || "not_started");
      setEstimatedMinutes(topic.estimatedMinutes != null ? String(topic.estimatedMinutes) : "");
    } else {
      setTitle("");
      setSubjectId(defaultSubjectId || (subjects.length > 0 ? subjects[0].id : ""));
      setDeadline("");
      setPriority("medium");
      setStatus("not_started");
      setEstimatedMinutes("45");
    }
  }, [topic, defaultSubjectId, subjects, visible]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert("Required", "Topic title cannot be empty.");
      return;
    }
    if (!subjectId) {
      Alert.alert("Required", "Please select a subject for this topic.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        title: title.trim(),
        subjectId,
        deadline: deadline.trim() ? new Date(deadline.trim()).toISOString() : null,
        priority,
        status,
        estimatedMinutes: estimatedMinutes.trim() ? Number(estimatedMinutes.trim()) : null
      });
      onClose();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save topic.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!topic || !onDelete) return;

    Alert.alert(
      "Delete Topic?",
      `Deleting "${topic.title}" will also delete all associated flashcards. This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Topic",
          style: "destructive",
          onPress: async () => {
            setIsSubmitting(true);
            try {
              await onDelete(topic.id);
              onClose();
            } finally {
              setIsSubmitting(false);
            }
          }
        }
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={topic ? "Edit Topic" : "New Topic"}
      subtitle="Syllabus unit & study target"
      scrollable
    >
      <View style={styles.container}>
        <TextInput
          label="Topic Title"
          placeholder="e.g. Dynamic Programming, Photosynthesis"
          value={title}
          onChangeText={setTitle}
        />

        {/* Subject Selector */}
        <View style={styles.selectorSection}>
          <ThemedText variant="caption" color={colors.inkMuted} style={styles.sectionLabel}>
            SUBJECT
          </ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsScroll}>
            {subjects.map((s) => {
              const isSelected = subjectId === s.id;
              return (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => setSubjectId(s.id)}
                  style={[
                    styles.subjectPill,
                    isSelected && { borderColor: s.color, backgroundColor: `${s.color}15` }
                  ]}
                  activeOpacity={0.8}
                >
                  <View style={[styles.pillDot, { backgroundColor: s.color || colors.primary }]} />
                  <ThemedText
                    variant="caption"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={[styles.pillText, isSelected && { color: s.color, fontWeight: "700" }]}
                  >
                    {s.name}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Priority Selector */}
        <View style={styles.selectorSection}>
          <ThemedText variant="caption" color={colors.inkMuted} style={styles.sectionLabel}>
            PRIORITY
          </ThemedText>
          <View style={styles.pillsRow}>
            {(["low", "medium", "high"] as const).map((p) => {
              const isSelected = priority === p;
              return (
                <TouchableOpacity
                  key={p}
                  onPress={() => setPriority(p)}
                  style={[styles.segmentPill, isSelected && styles.segmentPillSelected]}
                  activeOpacity={0.8}
                >
                  <ThemedText
                    variant="caption"
                    style={[styles.segmentText, isSelected && styles.segmentTextSelected]}
                  >
                    {p.toUpperCase()}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Status Selector */}
        <View style={styles.selectorSection}>
          <ThemedText variant="caption" color={colors.inkMuted} style={styles.sectionLabel}>
            STATUS
          </ThemedText>
          <View style={styles.pillsRow}>
            {(["not_started", "in_progress", "completed"] as const).map((st) => {
              const isSelected = status === st;
              const label = st === "not_started" ? "To Do" : st === "in_progress" ? "In Progress" : "Done";
              return (
                <TouchableOpacity
                  key={st}
                  onPress={() => setStatus(st)}
                  style={[styles.segmentPill, isSelected && styles.segmentPillSelected]}
                  activeOpacity={0.8}
                >
                  <ThemedText
                    variant="caption"
                    style={[styles.segmentText, isSelected && styles.segmentTextSelected]}
                  >
                    {label}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TextInput
          label="Estimated Duration (Minutes)"
          placeholder="e.g. 45"
          value={estimatedMinutes}
          onChangeText={setEstimatedMinutes}
          keyboardType="numeric"
        />

        <TextInput
          label="Target Deadline (Optional)"
          placeholder="YYYY-MM-DD"
          value={deadline}
          onChangeText={setDeadline}
        />

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          {topic && onDelete && (
            <TouchableOpacity
              onPress={handleDelete}
              disabled={isSubmitting}
              style={styles.deleteBtn}
              activeOpacity={0.8}
            >
              <Trash2 size={18} color={colors.error} />
            </TouchableOpacity>
          )}

          <Button
            variant="secondary"
            title="Cancel"
            onPress={onClose}
            style={styles.flexBtn}
            disabled={isSubmitting}
          />
          <Button
            variant="primary"
            title={topic ? "Save Changes" : "Create Topic"}
            onPress={handleSubmit}
            style={styles.flexBtn}
            disabled={isSubmitting}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.md
  },
  selectorSection: {
    gap: spacing.xs
  },
  sectionLabel: {
    fontWeight: "700"
  },
  pillsScroll: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingVertical: 2
  },
  subjectPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface
  },
  pillDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  pillText: {
    color: colors.ink
  },
  pillsRow: {
    flexDirection: "row",
    gap: spacing.xs
  },
  segmentPill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface
  },
  segmentPillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  segmentText: {
    fontWeight: "600",
    color: colors.inkSecondary
  },
  segmentTextSelected: {
    color: colors.onPrimary,
    fontWeight: "700"
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs
  },
  deleteBtn: {
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: "#fff1f2",
    borderWidth: 1,
    borderColor: "#fecdd3",
    alignItems: "center",
    justifyContent: "center"
  },
  flexBtn: {
    flex: 1
  }
});
