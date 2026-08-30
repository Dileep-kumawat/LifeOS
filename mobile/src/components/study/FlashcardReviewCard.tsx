import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Eye, RotateCw, Sparkles, BookOpen, Layers } from "lucide-react-native";
import { ThemedText } from "../ui/ThemedText";
import { colors, radius, spacing, shadows } from "../../theme";

export interface FlashcardReviewCardProps {
  id: string;
  front: string;
  back: string;
  topicTitle?: string | null;
  subjectName?: string | null;
  subjectColor?: string | null;
  repetitions?: number;
  intervalDays?: number;
  easeFactor?: number;
  isRevealed?: boolean;
  onReview?: (quality: number) => void;
}

export const FlashcardReviewCard: React.FC<FlashcardReviewCardProps> = ({
  front,
  back,
  topicTitle,
  subjectName,
  subjectColor = "#0075de",
  repetitions = 0,
  intervalDays = 0,
  isRevealed: controlledIsRevealed,
  onReview
}) => {
  const [internalRevealed, setInternalRevealed] = useState(false);
  const isRevealed = controlledIsRevealed !== undefined ? controlledIsRevealed : internalRevealed;

  const handleReveal = () => {
    setInternalRevealed(true);
  };

  const handleRate = (quality: number) => {
    onReview?.(quality);
    setInternalRevealed(false);
  };

  return (
    <View style={[styles.card, shadows.card]}>
      {/* Top Card Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {subjectName ? (
            <View style={styles.subjectBadge}>
              <View style={[styles.subjectDot, { backgroundColor: subjectColor || "#0075de" }]} />
              <ThemedText
                variant="caption"
                style={styles.subjectText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {subjectName}
              </ThemedText>
            </View>
          ) : null}
          {topicTitle ? (
            <View style={styles.topicBadge}>
              <Layers size={12} color={colors.inkMuted} />
              <ThemedText
                variant="caption"
                color={colors.inkMuted}
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{ flexShrink: 1 }}
              >
                {topicTitle}
              </ThemedText>
            </View>
          ) : null}
        </View>

        <View style={styles.headerRight}>
          <ThemedText variant="caption" color={colors.inkFaint}>
            Reps: {repetitions} • {intervalDays}d
          </ThemedText>
        </View>
      </View>

      {/* Front Face (Question) */}
      <View style={styles.questionSection}>
        <View style={styles.sectionLabelRow}>
          <BookOpen size={13} color={colors.primary} />
          <ThemedText variant="eyebrow" style={styles.questionLabel}>
            QUESTION
          </ThemedText>
        </View>
        <ThemedText variant="title" style={styles.questionText}>
          {front}
        </ThemedText>
      </View>

      {/* Back Face (Answer) */}
      {isRevealed ? (
        <View style={styles.answerSection}>
          <View style={styles.sectionLabelRow}>
            <Sparkles size={13} color={colors.accentGreen} />
            <ThemedText variant="eyebrow" color={colors.accentGreen} style={styles.answerLabel}>
              ANSWER
            </ThemedText>
          </View>
          <ThemedText variant="bodyMd" style={styles.answerText}>
            {back}
          </ThemedText>
        </View>
      ) : (
        <View style={styles.revealSection}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleReveal}
            style={styles.revealButton}
          >
            <Eye size={16} color={colors.onPrimary} />
            <ThemedText variant="bodySm" style={styles.revealButtonText}>
              Show Answer
            </ThemedText>
          </TouchableOpacity>
          <ThemedText variant="caption" color={colors.inkFaint} style={styles.revealHint}>
            Test your recall before revealing
          </ThemedText>
        </View>
      )}

      {/* Bottom Self-Assessment Bar (Shown when revealed) */}
      {isRevealed && (
        <View style={styles.assessmentSection}>
          <ThemedText variant="caption" color={colors.inkMuted} style={styles.assessmentTitle}>
            Rate your recall (SM-2 Spaced Repetition)
          </ThemedText>

          <View style={styles.ratingGrid}>
            {/* Again (0 / reset) */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleRate(0)}
              style={[styles.ratingBtn, styles.againBtn]}
            >
              <View style={styles.ratingBtnContent}>
                <RotateCw size={12} color="#be123c" />
                <ThemedText variant="caption" style={[styles.ratingLabel, { color: "#be123c" }]}>
                  Again
                </ThemedText>
              </View>
              <ThemedText variant="caption" style={[styles.ratingSubLabel, { color: "#e11d48" }]}>
                Reset (1d)
              </ThemedText>
            </TouchableOpacity>

            {/* Hard (2 / struggled) */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleRate(2)}
              style={[styles.ratingBtn, styles.hardBtn]}
            >
              <ThemedText variant="caption" style={[styles.ratingLabel, { color: "#b45309" }]}>
                Hard
              </ThemedText>
              <ThemedText variant="caption" style={[styles.ratingSubLabel, { color: "#d97706" }]}>
                Struggled (1d)
              </ThemedText>
            </TouchableOpacity>

            {/* Good (4 / normal) */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleRate(4)}
              style={[styles.ratingBtn, styles.goodBtn]}
            >
              <ThemedText variant="caption" style={[styles.ratingLabel, { color: "#0369a1" }]}>
                Good
              </ThemedText>
              <ThemedText variant="caption" style={[styles.ratingSubLabel, { color: "#0284c7" }]}>
                Normal
              </ThemedText>
            </TouchableOpacity>

            {/* Easy (5 / max) */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleRate(5)}
              style={[styles.ratingBtn, styles.easyBtn]}
            >
              <ThemedText variant="caption" style={[styles.ratingLabel, { color: "#047857" }]}>
                Easy
              </ThemedText>
              <ThemedText variant="caption" style={[styles.ratingSubLabel, { color: "#059669" }]}>
                Max interval
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    overflow: "hidden",
    marginVertical: spacing.sm
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.canvasSoft,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flex: 1,
    minWidth: 0
  },
  headerRight: {
    flexShrink: 0
  },
  subjectBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.hairline,
    maxWidth: 130,
    flexShrink: 1
  },
  subjectDot: {
    width: 7,
    height: 7,
    borderRadius: 4
  },
  subjectText: {
    fontWeight: "700",
    color: colors.ink,
    flexShrink: 1
  },
  topicBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    maxWidth: 110,
    flexShrink: 1
  },
  questionSection: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    minHeight: 120
  },
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: spacing.xs
  },
  questionLabel: {
    color: colors.primary,
    fontWeight: "700"
  },
  questionText: {
    color: colors.ink,
    lineHeight: 24,
    fontWeight: "600"
  },
  revealSection: {
    padding: spacing.md,
    backgroundColor: colors.canvasSoft,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    alignItems: "center",
    justifyContent: "center"
  },
  revealButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: 10,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: radius.full
  },
  revealButtonText: {
    color: colors.onPrimary,
    fontWeight: "700"
  },
  revealHint: {
    marginTop: spacing.xxs
  },
  answerSection: {
    padding: spacing.lg,
    backgroundColor: colors.canvasSoft,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    minHeight: 120
  },
  answerLabel: {
    fontWeight: "700"
  },
  answerText: {
    color: colors.inkSecondary,
    lineHeight: 22
  },
  assessmentSection: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.hairline
  },
  assessmentTitle: {
    textAlign: "center",
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: spacing.xs,
    fontSize: 10
  },
  ratingGrid: {
    flexDirection: "row",
    gap: spacing.xs
  },
  ratingBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: radius.md,
    borderWidth: 1
  },
  ratingBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3
  },
  ratingLabel: {
    fontWeight: "700"
  },
  ratingSubLabel: {
    fontSize: 9,
    marginTop: 1
  },
  againBtn: {
    backgroundColor: "#fff1f2",
    borderColor: "#fecdd3"
  },
  hardBtn: {
    backgroundColor: "#fffbeb",
    borderColor: "#fde68a"
  },
  goodBtn: {
    backgroundColor: "#f0f9ff",
    borderColor: "#bae6fd"
  },
  easyBtn: {
    backgroundColor: "#ecfdf5",
    borderColor: "#a7f3d0"
  }
});
