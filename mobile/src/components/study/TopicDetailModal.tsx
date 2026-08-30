import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { BookOpen, Timer, Plus, Edit3 } from "lucide-react-native";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { ThemedText } from "../ui/ThemedText";
import { topicRepo } from "../../db/repositories/topicRepo";
import { flashcardRepo } from "../../db/repositories/flashcardRepo";
import { colors, radius, spacing } from "../../theme";
import type { LocalTopic, LocalSubject, LocalFlashcard } from "../../db/schema";

export interface TopicDetailModalProps {
  visible: boolean;
  onClose: () => void;
  topic: LocalTopic | null;
  subject: LocalSubject | null;
  userId: string;
  onEditTopic: (topic: LocalTopic) => void;
  onAddFlashcard: (topicId: string, subjectId: string) => void;
  onEditFlashcard: (card: LocalFlashcard) => void;
  onStartFocusTimer?: (topic: LocalTopic) => void;
  onTopicUpdated?: () => void;
}

export const TopicDetailModal: React.FC<TopicDetailModalProps> = ({
  visible,
  onClose,
  topic,
  subject,
  userId,
  onEditTopic,
  onAddFlashcard,
  onEditFlashcard,
  onStartFocusTimer,
  onTopicUpdated
}) => {
  const [cards, setCards] = useState<LocalFlashcard[]>([]);
  const [focusMinutes, setFocusMinutes] = useState(0);

  const loadTopicData = useCallback(async () => {
    if (!topic || !userId) return;
    const topicCards = await flashcardRepo.listFlashcards(userId, { topicId: topic.id });
    setCards(topicCards);

    const mins = await topicRepo.getTopicFocusMinutes(topic.id);
    setFocusMinutes(mins);
  }, [topic, userId]);

  useEffect(() => {
    if (visible && topic) {
      loadTopicData();
    }
  }, [visible, topic, loadTopicData]);

  if (!topic) return null;

  const handleToggleStatus = async () => {
    const nextStatus =
      topic.status === "completed"
        ? "not_started"
        : topic.status === "in_progress"
          ? "completed"
          : "in_progress";

    await topicRepo.updateTopic(topic.id, { status: nextStatus });
    onTopicUpdated?.();
  };

  const statusLabel =
    topic.status === "completed" ? "Done" : topic.status === "in_progress" ? "In Progress" : "To Do";
  const statusColor =
    topic.status === "completed"
      ? colors.accentGreen
      : topic.status === "in_progress"
        ? colors.primary
        : colors.inkMuted;

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={topic.title}
      subtitle={subject?.name || "Topic Details"}
      scrollable
    >
      <View style={styles.container}>
        {/* Badges Row */}
        <View style={styles.badgeRow}>
          {subject && (
            <View style={styles.subjectBadge}>
              <View style={[styles.dot, { backgroundColor: subject.color }]} />
              <ThemedText
                variant="caption"
                style={styles.subjectText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {subject.name}
              </ThemedText>
            </View>
          )}

          <TouchableOpacity
            onPress={handleToggleStatus}
            style={[styles.statusBadge, { borderColor: statusColor }]}
            activeOpacity={0.8}
          >
            <ThemedText variant="caption" style={[styles.statusText, { color: statusColor }]}>
              {statusLabel}
            </ThemedText>
          </TouchableOpacity>

          <View style={styles.priorityBadge}>
            <ThemedText variant="caption" color={colors.inkSecondary}>
              {topic.priority.toUpperCase()}
            </ThemedText>
          </View>
        </View>

        {/* Metrics Grid */}
        <View style={styles.metricsGrid}>
          {/* Total Focus Time Card */}
          <Card style={styles.metricCard}>
            <View style={styles.metricIconWrap}>
              <Timer size={18} color={colors.primary} />
            </View>
            <View style={styles.metricTextWrap}>
              <ThemedText variant="heading3" style={styles.metricNumber}>
                {focusMinutes}m
              </ThemedText>
              <ThemedText variant="caption" color={colors.inkMuted} numberOfLines={1}>
                Logged Focus Time
              </ThemedText>
            </View>
          </Card>

          {/* Flashcard Deck Count */}
          <Card style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: "rgba(26, 174, 57, 0.12)" }]}>
              <BookOpen size={18} color={colors.accentGreen} />
            </View>
            <View style={styles.metricTextWrap}>
              <ThemedText variant="heading3" style={styles.metricNumber}>
                {cards.length}
              </ThemedText>
              <ThemedText variant="caption" color={colors.inkMuted} numberOfLines={1}>
                Flashcards
              </ThemedText>
            </View>
          </Card>
        </View>

        {/* Action Buttons */}
        <View style={styles.primaryActionRow}>
          {onStartFocusTimer && (
            <Button
              variant="primary"
              title="Start Focus Timer"
              onPress={() => {
                onClose();
                onStartFocusTimer(topic);
              }}
              style={styles.flexBtn}
            />
          )}

          <Button
            variant="secondary"
            title="Edit Topic"
            onPress={() => {
              onClose();
              onEditTopic(topic);
            }}
          />
        </View>

        {/* Flashcards Deck Section */}
        <View style={styles.cardsSection}>
          <View style={styles.cardsHeader}>
            <ThemedText variant="title" style={styles.sectionTitle}>
              Topic Flashcards ({cards.length})
            </ThemedText>
            <TouchableOpacity
              onPress={() => {
                onClose();
                onAddFlashcard(topic.id, topic.subjectId);
              }}
              style={styles.addCardBtn}
              activeOpacity={0.8}
            >
              <Plus size={14} color={colors.primary} />
              <ThemedText variant="caption" style={styles.addCardText}>
                Add Card
              </ThemedText>
            </TouchableOpacity>
          </View>

          {cards.length === 0 ? (
            <Card style={styles.emptyCardBox}>
              <ThemedText variant="bodySm" color={colors.inkMuted} style={styles.emptyText}>
                No flashcards created for this topic yet. Add cards to practice spaced repetition!
              </ThemedText>
            </Card>
          ) : (
            <View style={styles.cardsList}>
              {cards.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => {
                    onClose();
                    onEditFlashcard(c);
                  }}
                  style={styles.cardItem}
                  activeOpacity={0.8}
                >
                  <View style={styles.cardItemTextWrap}>
                    <ThemedText variant="bodySm" numberOfLines={2} style={styles.cardFrontText}>
                      {c.front}
                    </ThemedText>
                    <ThemedText variant="caption" color={colors.inkFaint} style={styles.cardMetaText}>
                      Reps: {c.repetitions} • Interval: {c.intervalDays}d • Next: {c.nextReviewDate.split("T")[0]}
                    </ThemedText>
                  </View>
                  <Edit3 size={16} color={colors.inkMuted} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.md
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexWrap: "wrap"
  },
  subjectBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
    flexShrink: 1,
    maxWidth: "100%"
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  subjectText: {
    fontWeight: "700",
    color: colors.ink,
    flexShrink: 1
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    backgroundColor: colors.surface,
    flexShrink: 0
  },
  statusText: {
    fontWeight: "700"
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.canvasSoft,
    flexShrink: 0
  },
  metricsGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap"
  },
  metricCard: {
    flex: 1,
    minWidth: 130,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md
  },
  metricIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: "rgba(0, 117, 222, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  metricTextWrap: {
    flex: 1,
    minWidth: 0
  },
  metricNumber: {
    color: colors.ink,
    fontWeight: "700"
  },
  primaryActionRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  flexBtn: {
    flex: 1
  },
  cardsSection: {
    gap: spacing.xs,
    marginTop: spacing.xs
  },
  cardsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  sectionTitle: {
    fontWeight: "700"
  },
  addCardBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: "rgba(0, 117, 222, 0.10)"
  },
  addCardText: {
    color: colors.primary,
    fontWeight: "700"
  },
  emptyCardBox: {
    padding: spacing.md,
    alignItems: "center",
    justifyContent: "center"
  },
  emptyText: {
    textAlign: "center"
  },
  cardsList: {
    gap: spacing.xs
  },
  cardItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline
  },
  cardItemTextWrap: {
    flex: 1,
    marginRight: spacing.sm,
    gap: 2
  },
  cardFrontText: {
    fontWeight: "600",
    color: colors.ink
  },
  cardMetaText: {
    fontSize: 11
  }
});
