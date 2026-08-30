import React, { useState, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { BookOpen, Target, X, Check } from "lucide-react-native";
import { Modal } from "../ui/Modal";
import { ThemedText } from "../ui/ThemedText";
import { topicRepo } from "../../db/repositories/topicRepo";
import { goalRepo } from "../../db/repositories/goalRepo";
import { subjectRepo } from "../../db/repositories/subjectRepo";
import { colors, radius, spacing } from "../../theme";
import type { LocalTopic, LocalGoal, LocalSubject } from "../../db/schema";

export interface SessionLinkPickerProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  currentType: "task" | "goal" | "topic" | "none";
  currentId: string | null;
  onSelect: (link: {
    linkedType: "task" | "goal" | "topic" | "none";
    linkedId: string | null;
    linkedTitle?: string;
  }) => void;
}

export const SessionLinkPicker: React.FC<SessionLinkPickerProps> = ({
  visible,
  onClose,
  userId,
  currentType,
  currentId,
  onSelect
}) => {
  const [selectedType, setSelectedType] = useState<"task" | "goal" | "topic" | "none">(currentType);
  const [topics, setTopics] = useState<LocalTopic[]>([]);
  const [goals, setGoals] = useState<LocalGoal[]>([]);
  const [subjectsMap, setSubjectsMap] = useState<Record<string, LocalSubject>>({});

  useEffect(() => {
    if (visible && userId) {
      setSelectedType(currentType);
      topicRepo.listTopics(userId).then(setTopics);
      goalRepo.listGoals(userId).then(setGoals);
      subjectRepo.listSubjects(userId).then((subs) => {
        const sMap: Record<string, LocalSubject> = {};
        subs.forEach((s) => (sMap[s.id] = s));
        setSubjectsMap(sMap);
      });
    }
  }, [visible, userId, currentType]);

  const handleSelectNone = () => {
    onSelect({ linkedType: "none", linkedId: null, linkedTitle: "" });
    onClose();
  };

  const handleSelectTopic = (t: LocalTopic) => {
    onSelect({ linkedType: "topic", linkedId: t.id, linkedTitle: t.title });
    onClose();
  };

  const handleSelectGoal = (g: LocalGoal) => {
    onSelect({ linkedType: "goal", linkedId: g.id, linkedTitle: g.title });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title="Link Focus Session"
      subtitle="Track study time toward a topic or goal"
      scrollable
    >
      <View style={styles.container}>
        {/* Type Tabs */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            onPress={() => setSelectedType("topic")}
            style={[styles.tabBtn, selectedType === "topic" && styles.tabBtnActive]}
            activeOpacity={0.8}
          >
            <BookOpen size={14} color={selectedType === "topic" ? colors.primary : colors.inkMuted} />
            <ThemedText
              variant="caption"
              style={[styles.tabBtnText, selectedType === "topic" && styles.tabBtnTextActive]}
            >
              Topics ({topics.length})
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedType("goal")}
            style={[styles.tabBtn, selectedType === "goal" && styles.tabBtnActive]}
            activeOpacity={0.8}
          >
            <Target size={14} color={selectedType === "goal" ? colors.primary : colors.inkMuted} />
            <ThemedText
              variant="caption"
              style={[styles.tabBtnText, selectedType === "goal" && styles.tabBtnTextActive]}
            >
              Goals ({goals.length})
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSelectNone}
            style={[styles.tabBtn, selectedType === "none" && styles.tabBtnActive]}
            activeOpacity={0.8}
          >
            <X size={14} color={selectedType === "none" ? colors.primary : colors.inkMuted} />
            <ThemedText
              variant="caption"
              style={[styles.tabBtnText, selectedType === "none" && styles.tabBtnTextActive]}
            >
              No Link
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* List Content */}
        {selectedType === "topic" && (
          <View style={styles.listContainer}>
            {topics.length === 0 ? (
              <View style={styles.emptyWrap}>
                <ThemedText variant="bodySm" color={colors.inkMuted}>
                  No topics available in your study syllabus.
                </ThemedText>
              </View>
            ) : (
              topics.map((t) => {
                const isSelected = currentType === "topic" && currentId === t.id;
                const subject = subjectsMap[t.subjectId];
                return (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => handleSelectTopic(t)}
                    style={[styles.itemCard, isSelected && styles.itemCardSelected]}
                    activeOpacity={0.8}
                  >
                    <View style={styles.itemTextWrap}>
                      <ThemedText
                        variant="bodySm"
                        style={styles.itemTitle}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {t.title}
                      </ThemedText>
                      {subject && (
                        <View style={styles.itemSubBadge}>
                          <View style={[styles.dot, { backgroundColor: subject.color }]} />
                          <ThemedText variant="caption" color={colors.inkMuted} numberOfLines={1}>
                            {subject.name}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                    {isSelected && <Check size={16} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {selectedType === "goal" && (
          <View style={styles.listContainer}>
            {goals.length === 0 ? (
              <View style={styles.emptyWrap}>
                <ThemedText variant="bodySm" color={colors.inkMuted}>
                  No active goals available.
                </ThemedText>
              </View>
            ) : (
              goals.map((g) => {
                const isSelected = currentType === "goal" && currentId === g.id;
                return (
                  <TouchableOpacity
                    key={g.id}
                    onPress={() => handleSelectGoal(g)}
                    style={[styles.itemCard, isSelected && styles.itemCardSelected]}
                    activeOpacity={0.8}
                  >
                    <View style={styles.itemTextWrap}>
                      <ThemedText
                        variant="bodySm"
                        style={styles.itemTitle}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {g.title}
                      </ThemedText>
                      <ThemedText variant="caption" color={colors.inkMuted} numberOfLines={1}>
                        Target: {g.targetDate ? g.targetDate.split("T")[0] : "Ongoing"}
                      </ThemedText>
                    </View>
                    {isSelected && <Check size={16} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.md
  },
  tabsRow: {
    flexDirection: "row",
    gap: spacing.xs,
    backgroundColor: colors.canvasSoft,
    padding: 3,
    borderRadius: radius.md
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 7,
    borderRadius: radius.sm
  },
  tabBtnActive: {
    backgroundColor: colors.surface
  },
  tabBtnText: {
    color: colors.inkMuted,
    fontWeight: "600"
  },
  tabBtnTextActive: {
    color: colors.ink,
    fontWeight: "700"
  },
  listContainer: {
    gap: spacing.xs,
    maxHeight: 280
  },
  emptyWrap: {
    padding: spacing.lg,
    alignItems: "center"
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline
  },
  itemCardSelected: {
    borderColor: colors.primary,
    backgroundColor: "rgba(0, 117, 222, 0.04)"
  },
  itemTextWrap: {
    flex: 1,
    minWidth: 0,
    marginRight: spacing.xs,
    gap: 2
  },
  itemTitle: {
    fontWeight: "600",
    color: colors.ink
  },
  itemSubBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3
  }
});
