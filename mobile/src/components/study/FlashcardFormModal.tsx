import React, { useState, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, Alert, ScrollView } from "react-native";
import { Trash2 } from "lucide-react-native";
import { Modal } from "../ui/Modal";
import { TextInput } from "../ui/TextInput";
import { Button } from "../ui/Button";
import { ThemedText } from "../ui/ThemedText";
import { colors, radius, spacing } from "../../theme";
import type { LocalFlashcard, LocalSubject, LocalTopic } from "../../db/schema";

export interface FlashcardFormModalProps {
  visible: boolean;
  onClose: () => void;
  flashcard?: LocalFlashcard | null;
  subjects: LocalSubject[];
  topics: LocalTopic[];
  defaultSubjectId?: string | null;
  defaultTopicId?: string | null;
  onSave: (data: {
    front: string;
    back: string;
    subjectId: string | null;
    topicId: string | null;
  }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export const FlashcardFormModal: React.FC<FlashcardFormModalProps> = ({
  visible,
  onClose,
  flashcard,
  subjects,
  topics,
  defaultSubjectId,
  defaultTopicId,
  onSave,
  onDelete
}) => {
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [topicId, setTopicId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (flashcard) {
      setFront(flashcard.front);
      setBack(flashcard.back);
      setSubjectId(flashcard.subjectId || null);
      setTopicId(flashcard.topicId || null);
    } else {
      setFront("");
      setBack("");
      setSubjectId(defaultSubjectId || (subjects.length > 0 ? subjects[0].id : null));
      setTopicId(defaultTopicId || null);
    }
  }, [flashcard, defaultSubjectId, defaultTopicId, subjects, visible]);

  const filteredTopics = subjectId
    ? topics.filter((t) => t.subjectId === subjectId)
    : topics;

  const handleSubmit = async () => {
    if (!front.trim()) {
      Alert.alert("Required", "Front question text cannot be empty.");
      return;
    }
    if (!back.trim()) {
      Alert.alert("Required", "Back answer text cannot be empty.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        front: front.trim(),
        back: back.trim(),
        subjectId,
        topicId
      });
      onClose();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save flashcard.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!flashcard || !onDelete) return;

    Alert.alert(
      "Delete Flashcard?",
      "Are you sure you want to delete this flashcard?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Card",
          style: "destructive",
          onPress: async () => {
            setIsSubmitting(true);
            try {
              await onDelete(flashcard.id);
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
      title={flashcard ? "Edit Flashcard" : "New Flashcard"}
      subtitle="Spaced repetition recall item"
      scrollable
    >
      <View style={styles.container}>
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
                  onPress={() => {
                    setSubjectId(s.id);
                    // Clear topic if not under new subject
                    if (topicId) {
                      const stillValid = topics.some((t) => t.id === topicId && t.subjectId === s.id);
                      if (!stillValid) setTopicId(null);
                    }
                  }}
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

        {/* Topic Selector */}
        {filteredTopics.length > 0 && (
          <View style={styles.selectorSection}>
            <ThemedText variant="caption" color={colors.inkMuted} style={styles.sectionLabel}>
              TOPIC (OPTIONAL)
            </ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsScroll}>
              <TouchableOpacity
                onPress={() => setTopicId(null)}
                style={[styles.topicPill, !topicId && styles.topicPillSelected]}
                activeOpacity={0.8}
              >
                <ThemedText variant="caption" style={[styles.topicText, !topicId && styles.topicTextSelected]}>
                  None
                </ThemedText>
              </TouchableOpacity>
              {filteredTopics.map((t) => {
                const isSelected = topicId === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => setTopicId(t.id)}
                    style={[styles.topicPill, isSelected && styles.topicPillSelected]}
                    activeOpacity={0.8}
                  >
                    <ThemedText
                      variant="caption"
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      style={[styles.topicText, isSelected && styles.topicTextSelected]}
                    >
                      {t.title}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        <TextInput
          label="Front (Question / Concept)"
          placeholder="e.g. What is the time complexity of QuickSort average vs worst case?"
          value={front}
          onChangeText={setFront}
          multiline
          numberOfLines={3}
          style={styles.textArea}
        />

        <TextInput
          label="Back (Answer / Explanation)"
          placeholder="e.g. Average: O(N log N). Worst case: O(N^2) when pivot is always smallest/largest element."
          value={back}
          onChangeText={setBack}
          multiline
          numberOfLines={4}
          style={styles.textArea}
        />

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          {flashcard && onDelete && (
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
            title={flashcard ? "Save Changes" : "Create Card"}
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
  topicPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface
  },
  topicPillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  topicText: {
    color: colors.inkSecondary
  },
  topicTextSelected: {
    color: colors.onPrimary,
    fontWeight: "700"
  },
  textArea: {
    minHeight: 70
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
