import React, { useState, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Trash2 } from "lucide-react-native";
import { Modal } from "../ui/Modal";
import { TextInput } from "../ui/TextInput";
import { Button } from "../ui/Button";
import { ThemedText } from "../ui/ThemedText";
import { colors, radius, spacing } from "../../theme";
import type { LocalSubject } from "../../db/schema";

export interface SubjectModalProps {
  visible: boolean;
  onClose: () => void;
  subject?: LocalSubject | null;
  onSave: (data: { name: string; color: string; examDate: string | null }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const SUBJECT_COLORS = [
  "#0075de", // Primary Blue
  "#1aae39", // Green
  "#dd5b00", // Orange
  "#2a9d99", // Teal
  "#ff64c8", // Pink
  "#793400", // Amber/Brown
  "#391c57"  // Deep Purple
];

export const SubjectModal: React.FC<SubjectModalProps> = ({
  visible,
  onClose,
  subject,
  onSave,
  onDelete
}) => {
  const [name, setName] = useState("");
  const [color, setColor] = useState(SUBJECT_COLORS[0]);
  const [examDate, setExamDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (subject) {
      setName(subject.name);
      setColor(subject.color || SUBJECT_COLORS[0]);
      setExamDate(subject.examDate ? subject.examDate.split("T")[0] : "");
    } else {
      setName("");
      setColor(SUBJECT_COLORS[0]);
      setExamDate("");
    }
  }, [subject, visible]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("Required", "Subject name cannot be empty.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        name: name.trim(),
        color,
        examDate: examDate.trim() ? new Date(examDate.trim()).toISOString() : null
      });
      onClose();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save subject.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!subject || !onDelete) return;

    Alert.alert(
      "Delete Subject?",
      `Deleting "${subject.name}" will cascade-delete all its topics and flashcards. This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Subject & Cards",
          style: "destructive",
          onPress: async () => {
            setIsSubmitting(true);
            try {
              await onDelete(subject.id);
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
      title={subject ? "Edit Subject" : "New Subject"}
      subtitle="Organize your topics & flashcard decks"
    >
      <View style={styles.container}>
        <TextInput
          label="Subject Name"
          placeholder="e.g. Organic Chemistry, Algorithms"
          value={name}
          onChangeText={setName}
        />

        {/* Color Palette Picker */}
        <View style={styles.colorSection}>
          <ThemedText variant="caption" color={colors.inkMuted} style={styles.colorLabel}>
            ACCENT COLOR
          </ThemedText>
          <View style={styles.colorRow}>
            {SUBJECT_COLORS.map((c) => {
              const isSelected = color === c;
              return (
                <TouchableOpacity
                  key={c}
                  onPress={() => setColor(c)}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: c },
                    isSelected && styles.colorCircleSelected
                  ]}
                  activeOpacity={0.8}
                >
                  {isSelected && <View style={styles.innerDot} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TextInput
          label="Exam Date (Optional)"
          placeholder="YYYY-MM-DD"
          value={examDate}
          onChangeText={setExamDate}
        />

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          {subject && onDelete && (
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
            title={subject ? "Save Changes" : "Create Subject"}
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
  colorSection: {
    gap: spacing.xs
  },
  colorLabel: {
    fontWeight: "700"
  },
  colorRow: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap"
  },
  colorCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center"
  },
  colorCircleSelected: {
    borderWidth: 2.5,
    borderColor: colors.ink
  },
  innerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface
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
