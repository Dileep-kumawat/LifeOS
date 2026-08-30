import { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl
} from "react-native";
import {
  BookOpen,
  GraduationCap,
  Plus,
  Layers,
  Calendar,
  Clock,
  ChevronRight
} from "lucide-react-native";
import { ScreenContainer } from "../../components/ui/ScreenContainer";
import { ThemedText } from "../../components/ui/ThemedText";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { useAuthStore } from "../../store/authStore";
import { subjectRepo } from "../../db/repositories/subjectRepo";
import { topicRepo } from "../../db/repositories/topicRepo";
import { flashcardRepo } from "../../db/repositories/flashcardRepo";
import { syncEngine } from "../../services/syncEngine";
import { colors, radius, spacing, shadows } from "../../theme";
import type { LocalSubject, LocalTopic, LocalFlashcard } from "../../db/schema";

import { DailyReviewQueueModal } from "../../components/study/DailyReviewQueueModal";
import { SubjectModal } from "../../components/study/SubjectModal";
import { TopicModal } from "../../components/study/TopicModal";
import { TopicDetailModal } from "../../components/study/TopicDetailModal";
import { FlashcardFormModal } from "../../components/study/FlashcardFormModal";

export function StudyScreen({ navigation }: any) {
  const user = useAuthStore((state) => state.user);

  const [subjects, setSubjects] = useState<LocalSubject[]>([]);
  const [topics, setTopics] = useState<LocalTopic[]>([]);
  const [flashcards, setFlashcards] = useState<LocalFlashcard[]>([]);
  const [dueCards, setDueCards] = useState<LocalFlashcard[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | "all">("all");
  const [refreshing, setRefreshing] = useState(false);

  // Modals state
  const [isReviewQueueVisible, setIsReviewQueueVisible] = useState(false);
  const [isSubjectModalVisible, setIsSubjectModalVisible] = useState(false);
  const [isTopicModalVisible, setIsTopicModalVisible] = useState(false);
  const [isFlashcardModalVisible, setIsFlashcardModalVisible] = useState(false);
  const [isTopicDetailVisible, setIsTopicDetailVisible] = useState(false);

  const [editingSubject, setEditingSubject] = useState<LocalSubject | null>(null);
  const [editingTopic, setEditingTopic] = useState<LocalTopic | null>(null);
  const [editingFlashcard, setEditingFlashcard] = useState<LocalFlashcard | null>(null);
  const [viewingTopic, setViewingTopic] = useState<LocalTopic | null>(null);
  const [defaultTopicSubjectId, setDefaultTopicSubjectId] = useState<string | null>(null);
  const [defaultCardTopicId, setDefaultCardTopicId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.id) return;

    const [subjectList, topicList, flashcardList, dueList] = await Promise.all([
      subjectRepo.listSubjects(user.id),
      topicRepo.listTopics(user.id),
      flashcardRepo.listFlashcards(user.id),
      flashcardRepo.getDueFlashcards(user.id)
    ]);

    setSubjects(subjectList);
    setTopics(topicList);
    setFlashcards(flashcardList);
    setDueCards(dueList);
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadData();
      await syncEngine.syncNow();
      await loadData();
    } finally {
      setRefreshing(false);
    }
  };

  // Subject Actions
  const handleSaveSubject = async (data: {
    name: string;
    color: string;
    examDate: string | null;
  }) => {
    if (!user?.id) return;
    if (editingSubject) {
      await subjectRepo.updateSubject(editingSubject.id, data);
    } else {
      await subjectRepo.createSubject({
        userId: user.id,
        ...data
      });
    }
    await loadData();
    syncEngine.syncNow().catch(() => {});
  };

  const handleDeleteSubject = async (id: string) => {
    await subjectRepo.deleteSubject(id);
    if (selectedSubjectId === id) {
      setSelectedSubjectId("all");
    }
    await loadData();
    syncEngine.syncNow().catch(() => {});
  };

  // Topic Actions
  const handleSaveTopic = async (data: {
    title: string;
    subjectId: string;
    deadline: string | null;
    priority: "low" | "medium" | "high";
    status: "not_started" | "in_progress" | "completed";
    estimatedMinutes: number | null;
  }) => {
    if (!user?.id) return;
    if (editingTopic) {
      await topicRepo.updateTopic(editingTopic.id, data);
    } else {
      await topicRepo.createTopic({
        userId: user.id,
        ...data
      });
    }
    await loadData();
    syncEngine.syncNow().catch(() => {});
  };

  const handleDeleteTopic = async (id: string) => {
    await topicRepo.deleteTopic(id);
    await loadData();
    syncEngine.syncNow().catch(() => {});
  };

  // Flashcard Actions
  const handleSaveFlashcard = async (data: {
    front: string;
    back: string;
    subjectId: string | null;
    topicId: string | null;
  }) => {
    if (!user?.id) return;
    if (editingFlashcard) {
      await flashcardRepo.updateFlashcard(editingFlashcard.id, data);
    } else {
      await flashcardRepo.createFlashcard({
        userId: user.id,
        ...data
      });
    }
    await loadData();
    syncEngine.syncNow().catch(() => {});
  };

  const handleDeleteFlashcard = async (id: string) => {
    await flashcardRepo.deleteFlashcard(id);
    await loadData();
    syncEngine.syncNow().catch(() => {});
  };

  // Filter topics by selected subject
  const filteredTopics =
    selectedSubjectId === "all"
      ? topics
      : topics.filter((t) => t.subjectId === selectedSubjectId);

  // Subject lookup map
  const subjectsMap: Record<string, LocalSubject> = {};
  subjects.forEach((s) => (subjectsMap[s.id] = s));

  // Count flashcards per topic
  const flashcardsPerTopic: Record<string, number> = {};
  flashcards.forEach((f) => {
    if (f.topicId) {
      flashcardsPerTopic[f.topicId] = (flashcardsPerTopic[f.topicId] || 0) + 1;
    }
  });

  return (
    <ScreenContainer
      scrollable
      includeDockPadding
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {/* Screen Header */}
      <View style={styles.header}>
        <View>
          <ThemedText variant="heading2">Study Planner</ThemedText>
          <ThemedText variant="bodySm" color={colors.inkMuted}>
            Syllabus, topics & spaced repetition flashcards
          </ThemedText>
        </View>
      </View>

      {/* Daily Review Queue Callout Banner */}
      <Card style={styles.reviewQueueCard}>
        <View style={styles.reviewQueueContent}>
          <View style={styles.reviewQueueIconWrap}>
            <GraduationCap size={28} color={colors.primary} />
          </View>
          <View style={styles.reviewQueueTextWrap}>
            <View style={styles.reviewQueueBadgeRow}>
              <ThemedText variant="caption" style={styles.reviewQueueBadgeText}>
                SM-2 SPATIAL RECALL
              </ThemedText>
              {dueCards.length > 0 && (
                <View style={styles.dueCountBadge}>
                  <ThemedText variant="caption" style={styles.dueCountText}>
                    {dueCards.length} DUE
                  </ThemedText>
                </View>
              )}
            </View>
            <ThemedText variant="title" style={styles.reviewQueueTitle}>
              {dueCards.length > 0
                ? `${dueCards.length} Flashcard${dueCards.length !== 1 ? "s" : ""} Due`
                : "Daily Review Complete"}
            </ThemedText>
            <ThemedText variant="caption" color={colors.inkMuted}>
              {dueCards.length > 0
                ? "Strengthen neural pathways with spaced interval review"
                : "All caught up for today! Review again tomorrow"}
            </ThemedText>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => setIsReviewQueueVisible(true)}
          style={[
            styles.startReviewBtn,
            dueCards.length === 0 && styles.startReviewBtnDisabled
          ]}
          activeOpacity={0.85}
        >
          <BookOpen size={16} color={colors.onPrimary} />
          <ThemedText variant="bodySm" style={styles.startReviewBtnText}>
            {dueCards.length > 0 ? "Start Review Queue" : "Open Deck"}
          </ThemedText>
        </TouchableOpacity>
      </Card>

      {/* Subject Selector Tabs / Pills */}
      <View style={styles.subjectsSection}>
        <View style={styles.sectionHeaderRow}>
          <ThemedText variant="title" style={styles.sectionTitle}>
            Subjects ({subjects.length})
          </ThemedText>
          <TouchableOpacity
            onPress={() => {
              setEditingSubject(null);
              setIsSubjectModalVisible(true);
            }}
            style={styles.addBtn}
            activeOpacity={0.8}
          >
            <Plus size={14} color={colors.primary} />
            <ThemedText variant="caption" style={styles.addBtnText}>
              New Subject
            </ThemedText>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subjectPillsScroll}
        >
          {/* All Subjects Pill */}
          <TouchableOpacity
            onPress={() => setSelectedSubjectId("all")}
            style={[
              styles.subjectTabPill,
              selectedSubjectId === "all" && styles.subjectTabPillSelected
            ]}
            activeOpacity={0.8}
          >
            <ThemedText
              variant="caption"
              numberOfLines={1}
              style={[
                styles.subjectTabPillText,
                selectedSubjectId === "all" && styles.subjectTabPillTextSelected
              ]}
            >
              All Topics ({topics.length})
            </ThemedText>
          </TouchableOpacity>

          {/* Individual Subject Pills */}
          {subjects.map((s) => {
            const isSelected = selectedSubjectId === s.id;
            const count = topics.filter((t) => t.subjectId === s.id).length;
            return (
              <TouchableOpacity
                key={s.id}
                onPress={() => setSelectedSubjectId(s.id)}
                onLongPress={() => {
                  setEditingSubject(s);
                  setIsSubjectModalVisible(true);
                }}
                style={[
                  styles.subjectTabPill,
                  isSelected && { borderColor: s.color, backgroundColor: `${s.color}15` }
                ]}
                activeOpacity={0.8}
              >
                <View style={[styles.pillColorDot, { backgroundColor: s.color || colors.primary }]} />
                <ThemedText
                  variant="caption"
                  numberOfLines={1}
                  style={[
                    styles.subjectTabPillText,
                    isSelected && { color: s.color, fontWeight: "700" }
                  ]}
                >
                  {s.name} ({count})
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Topics List Section */}
      <View style={styles.topicsSection}>
        <View style={styles.sectionHeaderRow}>
          <ThemedText variant="title" style={styles.sectionTitle}>
            Topics ({filteredTopics.length})
          </ThemedText>
          <View style={styles.topicActionBtns}>
            <TouchableOpacity
              onPress={() => {
                setEditingFlashcard(null);
                setDefaultTopicSubjectId(selectedSubjectId !== "all" ? selectedSubjectId : null);
                setIsFlashcardModalVisible(true);
              }}
              style={styles.addBtnSecondary}
              activeOpacity={0.8}
            >
              <Plus size={14} color={colors.inkSecondary} />
              <ThemedText variant="caption" color={colors.inkSecondary} style={styles.addBtnSecondaryText}>
                Card
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setEditingTopic(null);
                setDefaultTopicSubjectId(selectedSubjectId !== "all" ? selectedSubjectId : null);
                setIsTopicModalVisible(true);
              }}
              style={styles.addBtn}
              activeOpacity={0.8}
            >
              <Plus size={14} color={colors.primary} />
              <ThemedText variant="caption" style={styles.addBtnText}>
                Topic
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {filteredTopics.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Layers size={32} color={colors.inkMuted} style={styles.emptyIcon} />
            <ThemedText variant="title" style={styles.emptyCardTitle}>
              No Topics Found
            </ThemedText>
            <ThemedText variant="bodySm" color={colors.inkMuted} style={styles.emptyCardSubtitle}>
              {subjects.length === 0
                ? "Start by adding a subject, then add syllabus topics and flashcards."
                : "Add syllabus topics to track study progress and deck metrics."}
            </ThemedText>
            <Button
              variant="primary"
              title="Create Topic"
              onPress={() => {
                setEditingTopic(null);
                setIsTopicModalVisible(true);
              }}
              style={styles.emptyActionBtn}
            />
          </Card>
        ) : (
          <View style={styles.topicList}>
            {filteredTopics.map((topic) => {
              const subject = subjectsMap[topic.subjectId];
              const cardCount = flashcardsPerTopic[topic.id] || 0;
              const statusColor =
                topic.status === "completed"
                  ? colors.accentGreen
                  : topic.status === "in_progress"
                    ? colors.primary
                    : colors.inkMuted;
              const statusLabel =
                topic.status === "completed"
                  ? "Done"
                  : topic.status === "in_progress"
                    ? "In Progress"
                    : "To Do";

              return (
                <TouchableOpacity
                  key={topic.id}
                  onPress={() => {
                    setViewingTopic(topic);
                    setIsTopicDetailVisible(true);
                  }}
                  style={[styles.topicCard, shadows.card]}
                  activeOpacity={0.8}
                >
                  <View style={styles.topicCardHeader}>
                    <View style={styles.topicHeaderLeft}>
                      {subject && (
                        <View style={styles.topicSubjectBadge}>
                          <View style={[styles.pillColorDot, { backgroundColor: subject.color }]} />
                          <ThemedText
                            variant="caption"
                            style={styles.topicSubjectText}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {subject.name}
                          </ThemedText>
                        </View>
                      )}
                      <View style={[styles.topicStatusPill, { borderColor: statusColor }]}>
                        <ThemedText variant="caption" style={[styles.topicStatusText, { color: statusColor }]}>
                          {statusLabel}
                        </ThemedText>
                      </View>
                    </View>

                    <View style={styles.topicPriorityPill}>
                      <ThemedText variant="caption" color={colors.inkFaint}>
                        {topic.priority.toUpperCase()}
                      </ThemedText>
                    </View>
                  </View>

                  <ThemedText variant="title" style={styles.topicTitle} numberOfLines={2}>
                    {topic.title}
                  </ThemedText>

                  <View style={styles.topicCardFooter}>
                    <View style={styles.topicMetaItem}>
                      <BookOpen size={13} color={colors.inkMuted} />
                      <ThemedText variant="caption" color={colors.inkMuted}>
                        {cardCount} flashcard{cardCount !== 1 ? "s" : ""}
                      </ThemedText>
                    </View>

                    {topic.estimatedMinutes && (
                      <View style={styles.topicMetaItem}>
                        <Clock size={13} color={colors.inkMuted} />
                        <ThemedText variant="caption" color={colors.inkMuted}>
                          {topic.estimatedMinutes}m
                        </ThemedText>
                      </View>
                    )}

                    {topic.deadline && (
                      <View style={styles.topicMetaItem}>
                        <Calendar size={13} color={colors.inkMuted} />
                        <ThemedText variant="caption" color={colors.inkMuted}>
                          {topic.deadline.split("T")[0]}
                        </ThemedText>
                      </View>
                    )}

                    <ChevronRight size={16} color={colors.inkMuted} style={styles.chevron} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* Modals */}
      <DailyReviewQueueModal
        visible={isReviewQueueVisible}
        onClose={() => {
          setIsReviewQueueVisible(false);
          loadData();
        }}
        userId={user?.id || ""}
        onReviewed={loadData}
      />

      <SubjectModal
        visible={isSubjectModalVisible}
        onClose={() => setIsSubjectModalVisible(false)}
        subject={editingSubject}
        onSave={handleSaveSubject}
        onDelete={handleDeleteSubject}
      />

      <TopicModal
        visible={isTopicModalVisible}
        onClose={() => setIsTopicModalVisible(false)}
        topic={editingTopic}
        subjects={subjects}
        defaultSubjectId={defaultTopicSubjectId}
        onSave={handleSaveTopic}
        onDelete={handleDeleteTopic}
      />

      <TopicDetailModal
        visible={isTopicDetailVisible}
        onClose={() => setIsTopicDetailVisible(false)}
        topic={viewingTopic}
        subject={viewingTopic ? subjectsMap[viewingTopic.subjectId] : null}
        userId={user?.id || ""}
        onEditTopic={(t) => {
          setEditingTopic(t);
          setIsTopicModalVisible(true);
        }}
        onAddFlashcard={(tId, sId) => {
          setEditingFlashcard(null);
          setDefaultTopicSubjectId(sId);
          setDefaultCardTopicId(tId);
          setIsFlashcardModalVisible(true);
        }}
        onEditFlashcard={(c) => {
          setEditingFlashcard(c);
          setIsFlashcardModalVisible(true);
        }}
        onStartFocusTimer={(t) => {
          navigation?.navigate("Focus", {
            linkedType: "topic",
            linkedId: t.id,
            linkedTitle: t.title
          });
        }}
        onTopicUpdated={loadData}
      />

      <FlashcardFormModal
        visible={isFlashcardModalVisible}
        onClose={() => setIsFlashcardModalVisible(false)}
        flashcard={editingFlashcard}
        subjects={subjects}
        topics={topics}
        defaultSubjectId={defaultTopicSubjectId}
        defaultTopicId={defaultCardTopicId}
        onSave={handleSaveFlashcard}
        onDelete={handleDeleteFlashcard}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.md,
    gap: spacing.lg
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  reviewQueueCard: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderColor: colors.hairline,
    gap: spacing.md
  },
  reviewQueueContent: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center"
  },
  reviewQueueIconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: "rgba(0, 117, 222, 0.10)",
    alignItems: "center",
    justifyContent: "center"
  },
  reviewQueueTextWrap: {
    flex: 1,
    gap: 2
  },
  reviewQueueBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  reviewQueueBadgeText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 10
  },
  dueCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    backgroundColor: "#fff1f2",
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "#fecdd3"
  },
  dueCountText: {
    color: "#be123c",
    fontWeight: "700",
    fontSize: 9
  },
  reviewQueueTitle: {
    color: colors.ink,
    fontWeight: "700"
  },
  startReviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: 11,
    backgroundColor: colors.primary,
    borderRadius: radius.md
  },
  startReviewBtnDisabled: {
    backgroundColor: colors.inkMuted
  },
  startReviewBtnText: {
    color: colors.onPrimary,
    fontWeight: "700"
  },
  subjectsSection: {
    gap: spacing.xs
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  sectionTitle: {
    fontWeight: "700"
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: "rgba(0, 117, 222, 0.10)"
  },
  addBtnText: {
    color: colors.primary,
    fontWeight: "700"
  },
  topicActionBtns: {
    flexDirection: "row",
    gap: spacing.xs
  },
  addBtnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.canvasSoft,
    borderWidth: 1,
    borderColor: colors.hairline
  },
  addBtnSecondaryText: {
    fontWeight: "600"
  },
  subjectPillsScroll: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingVertical: 4
  },
  subjectTabPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
    maxWidth: 220
  },
  subjectTabPillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  subjectTabPillText: {
    color: colors.ink
  },
  subjectTabPillTextSelected: {
    color: colors.onPrimary,
    fontWeight: "700"
  },
  pillColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  topicsSection: {
    gap: spacing.sm
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs
  },
  emptyIcon: {
    marginBottom: spacing.xs
  },
  emptyCardTitle: {
    fontWeight: "700",
    color: colors.ink
  },
  emptyCardSubtitle: {
    textAlign: "center",
    lineHeight: 20
  },
  emptyActionBtn: {
    marginTop: spacing.md
  },
  topicList: {
    gap: spacing.sm
  },
  topicCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    gap: spacing.xs
  },
  topicCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.xs
  },
  topicHeaderLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    minWidth: 0
  },
  topicSubjectBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.canvasSoft,
    flexShrink: 1,
    maxWidth: "68%"
  },
  topicSubjectText: {
    fontWeight: "700",
    color: colors.inkSecondary,
    flexShrink: 1
  },
  topicStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 1.5,
    borderRadius: radius.full,
    borderWidth: 1,
    backgroundColor: colors.surface,
    flexShrink: 0
  },
  topicStatusText: {
    fontWeight: "700",
    fontSize: 10
  },
  topicPriorityPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.xs,
    backgroundColor: colors.canvasSoft,
    flexShrink: 0
  },
  topicTitle: {
    fontWeight: "700",
    color: colors.ink,
    lineHeight: 22
  },
  topicCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.xxs
  },
  topicMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 0
  },
  chevron: {
    marginLeft: "auto"
  }
});
