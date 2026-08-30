import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { CheckCircle2, Sparkles } from "lucide-react-native";
import { Modal } from "../ui/Modal";
import { ThemedText } from "../ui/ThemedText";
import { ProgressBar } from "../ui/ProgressBar";
import { Button } from "../ui/Button";
import { FlashcardReviewCard } from "./FlashcardReviewCard";
import { flashcardRepo } from "../../db/repositories/flashcardRepo";
import { subjectRepo } from "../../db/repositories/subjectRepo";
import { topicRepo } from "../../db/repositories/topicRepo";
import { syncEngine } from "../../services/syncEngine";
import { colors, radius, spacing } from "../../theme";
import type { LocalFlashcard, LocalSubject, LocalTopic } from "../../db/schema";

export interface DailyReviewQueueModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  onReviewed?: () => void;
}

export const DailyReviewQueueModal: React.FC<DailyReviewQueueModalProps> = ({
  visible,
  onClose,
  userId,
  onReviewed
}) => {
  const [cards, setCards] = useState<LocalFlashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [subjectsMap, setSubjectsMap] = useState<Record<string, LocalSubject>>({});
  const [topicsMap, setTopicsMap] = useState<Record<string, LocalTopic>>({});
  const [reviewedCount, setReviewedCount] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loadDueCards = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const due = await flashcardRepo.getDueFlashcards(userId);
      const subjects = await subjectRepo.listSubjects(userId);
      const topics = await topicRepo.listTopics(userId);

      const sMap: Record<string, LocalSubject> = {};
      subjects.forEach((s) => (sMap[s.id] = s));
      const tMap: Record<string, LocalTopic> = {};
      topics.forEach((t) => (tMap[t.id] = t));

      setSubjectsMap(sMap);
      setTopicsMap(tMap);
      setCards(due);
      setCurrentIndex(0);
      setReviewedCount(0);
      setIsCompleted(false);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (visible) {
      loadDueCards();
    }
  }, [visible, loadDueCards]);

  const handleReview = async (quality: number) => {
    const currentCard = cards[currentIndex];
    if (!currentCard) return;

    await flashcardRepo.reviewFlashcard(currentCard.id, quality);
    setReviewedCount((prev) => prev + 1);

    // Sync in background
    syncEngine.syncNow().catch(() => {});
    onReviewed?.();

    if (currentIndex + 1 < cards.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsCompleted(true);
    }
  };

  const currentCard = cards[currentIndex];
  const subject = currentCard?.subjectId ? subjectsMap[currentCard.subjectId] : null;
  const topic = currentCard?.topicId ? topicsMap[currentCard.topicId] : null;

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title="Daily Spaced Review"
      subtitle={
        cards.length > 0
          ? `Card ${Math.min(currentIndex + 1, cards.length)} of ${cards.length}`
          : "Spaced Repetition Queue"
      }
      scrollable
    >
      <View style={styles.container}>
        {isLoading ? (
          <View style={styles.emptyContainer}>
            <ThemedText variant="bodyMd" color={colors.inkMuted}>
              Loading review queue...
            </ThemedText>
          </View>
        ) : isCompleted ? (
          <View style={styles.completedContainer}>
            <View style={styles.celebrationIconWrap}>
              <CheckCircle2 size={44} color={colors.accentGreen} />
            </View>
            <ThemedText variant="heading2" style={styles.completedTitle}>
              Review Complete!
            </ThemedText>
            <ThemedText variant="bodyMd" color={colors.inkMuted} style={styles.completedSubtitle}>
              Great job! You reviewed {reviewedCount} flashcard{reviewedCount !== 1 ? "s" : ""} today using SM-2 spaced repetition.
            </ThemedText>

            <Button
              variant="primary"
              title="Done"
              onPress={onClose}
              style={styles.doneBtn}
            />
          </View>
        ) : cards.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <Sparkles size={36} color={colors.primary} />
            </View>
            <ThemedText variant="title" style={styles.emptyTitle}>
              All Caught Up!
            </ThemedText>
            <ThemedText variant="bodySm" color={colors.inkMuted} style={styles.emptySubtitle}>
              No flashcards are due for review today. Great work staying ahead of your spaced repetition schedule!
            </ThemedText>
            <Button
              variant="secondary"
              title="Close Queue"
              onPress={onClose}
              style={styles.closeBtn}
            />
          </View>
        ) : (
          <View style={styles.activeReviewContainer}>
            {/* Progress Bar */}
            <View style={styles.progressRow}>
              <ProgressBar
                progress={cards.length > 0 ? (currentIndex + 1) / cards.length : 0}
                color={colors.primary}
              />
              <ThemedText variant="caption" color={colors.inkFaint} style={styles.progressText}>
                {Math.round(((currentIndex + 1) / cards.length) * 100)}%
              </ThemedText>
            </View>

            {/* Flashcard Component */}
            {currentCard && (
              <FlashcardReviewCard
                key={currentCard.id}
                id={currentCard.id}
                front={currentCard.front}
                back={currentCard.back}
                subjectName={subject?.name}
                subjectColor={subject?.color}
                topicTitle={topic?.title}
                repetitions={currentCard.repetitions}
                intervalDays={currentCard.intervalDays}
                easeFactor={currentCard.easeFactor}
                onReview={handleReview}
              />
            )}
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.sm
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs
  },
  progressText: {
    fontWeight: "700",
    minWidth: 32,
    textAlign: "right"
  },
  activeReviewContainer: {
    gap: spacing.xs
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm
  },
  emptyIconWrap: {
    width: 68,
    height: 68,
    borderRadius: radius.full,
    backgroundColor: "rgba(0, 117, 222, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs
  },
  emptyTitle: {
    fontWeight: "700",
    color: colors.ink
  },
  emptySubtitle: {
    textAlign: "center",
    lineHeight: 20
  },
  closeBtn: {
    marginTop: spacing.md,
    minWidth: 140
  },
  completedContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm
  },
  celebrationIconWrap: {
    width: 76,
    height: 76,
    borderRadius: radius.full,
    backgroundColor: "rgba(26, 174, 57, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs
  },
  completedTitle: {
    color: colors.ink,
    fontWeight: "700"
  },
  completedSubtitle: {
    textAlign: "center",
    lineHeight: 22
  },
  doneBtn: {
    marginTop: spacing.lg,
    minWidth: 160
  }
});
