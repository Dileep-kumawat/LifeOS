import React from "react";
import { View, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { MessageSquare, Plus, Trash2 } from "lucide-react-native";
import type { ConversationSummary } from "../../services/aiChatService";
import { Modal } from "../ui/Modal";
import { ThemedText } from "../ui/ThemedText";
import { colors, radius, spacing } from "../../theme";

export interface ConversationHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
}

export const ConversationHistoryModal: React.FC<ConversationHistoryModalProps> = ({
  visible,
  onClose,
  conversations,
  activeConversationId,
  onSelect,
  onNewChat,
  onDelete
}) => {
  const handleDelete = (id: string, title: string) => {
    Alert.alert("Delete Conversation", `Delete "${title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => onDelete(id)
      }
    ]);
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title="Conversation History"
      subtitle="Past chat sessions with LifeOS AI"
      scrollable
    >
      <View style={styles.container}>
        {/* New Chat Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            onNewChat();
            onClose();
          }}
          style={styles.newChatBtn}
        >
          <Plus size={16} color={colors.onPrimary} />
          <ThemedText variant="bodySm" style={styles.newChatBtnText}>
            Start New Chat
          </ThemedText>
        </TouchableOpacity>

        {/* Conversation List */}
        {conversations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MessageSquare size={32} color={colors.inkMuted} />
            <ThemedText variant="bodySm" color={colors.inkMuted} style={styles.emptyText}>
              No past conversations found. Start typing to create one.
            </ThemedText>
          </View>
        ) : (
          <View style={styles.list}>
            {conversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              const dateFormatted = new Date(conv.updatedAt).toLocaleDateString([], {
                month: "short",
                day: "numeric"
              });

              return (
                <TouchableOpacity
                  key={conv.id}
                  activeOpacity={0.7}
                  onPress={() => {
                    onSelect(conv.id);
                    onClose();
                  }}
                  style={[styles.convItem, isActive && styles.convItemActive]}
                >
                  <View style={styles.convIconWrap}>
                    <MessageSquare
                      size={16}
                      color={isActive ? colors.primary : colors.inkSecondary}
                    />
                  </View>

                  <View style={styles.convInfo}>
                    <ThemedText
                      variant="bodySm"
                      numberOfLines={1}
                      style={[styles.convTitle, isActive && styles.convTitleActive]}
                    >
                      {conv.title || "Untitled Conversation"}
                    </ThemedText>
                    <ThemedText variant="caption" color={colors.inkMuted}>
                      {dateFormatted}
                    </ThemedText>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleDelete(conv.id, conv.title)}
                    style={styles.deleteBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Trash2 size={14} color={colors.error} />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
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
  newChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: radius.md
  },
  newChatBtnText: {
    color: colors.onPrimary,
    fontWeight: "700"
  },
  emptyContainer: {
    paddingVertical: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs
  },
  emptyText: {
    textAlign: "center"
  },
  list: {
    gap: spacing.xs
  },
  convItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    gap: spacing.sm
  },
  convItemActive: {
    borderColor: colors.primary,
    backgroundColor: colors.canvasSoft
  },
  convIconWrap: {
    padding: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.canvasSoft
  },
  convInfo: {
    flex: 1
  },
  convTitle: {
    fontWeight: "600",
    color: colors.ink
  },
  convTitleActive: {
    color: colors.primary,
    fontWeight: "700"
  },
  deleteBtn: {
    padding: spacing.xs
  }
});
