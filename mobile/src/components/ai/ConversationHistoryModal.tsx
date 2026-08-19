import React, { useState, useMemo } from "react";
import { View, StyleSheet, TouchableOpacity, Alert, TextInput, ScrollView } from "react-native";
import { MessageSquare, Plus, Trash2, Search, X, Sparkles } from "lucide-react-native";
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
  const [searchQuery, setSearchQuery] = useState("");

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter((c) => (c.title || "").toLowerCase().includes(q));
  }, [conversations, searchQuery]);

  // Group conversations by date bucket (ChatGPT style)
  const groupedConversations = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;
    const last7Days = today - 7 * 86400000;

    const groups: { title: string; items: ConversationSummary[] }[] = [
      { title: "Today", items: [] },
      { title: "Yesterday", items: [] },
      { title: "Previous 7 Days", items: [] },
      { title: "Older", items: [] }
    ];

    filteredConversations.forEach((conv) => {
      const convTime = new Date(conv.updatedAt).getTime();
      if (convTime >= today) {
        groups[0].items.push(conv);
      } else if (convTime >= yesterday) {
        groups[1].items.push(conv);
      } else if (convTime >= last7Days) {
        groups[2].items.push(conv);
      } else {
        groups[3].items.push(conv);
      }
    });

    return groups.filter((g) => g.items.length > 0);
  }, [filteredConversations]);

  const handleDelete = (id: string, title: string) => {
    Alert.alert("Delete Chat", `Delete "${title}"?`, [
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
      title="Chats"
      subtitle="Your LifeOS AI conversation history"
    >
      <View style={styles.container}>
        {/* New Chat Primary Action (ChatGPT Style) */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            onNewChat();
            onClose();
          }}
          style={styles.newChatBtn}
        >
          <View style={styles.newChatIconWrap}>
            <Plus size={16} color="#FFFFFF" />
          </View>
          <ThemedText variant="bodyMd" style={styles.newChatBtnText}>
            New chat
          </ThemedText>
        </TouchableOpacity>

        {/* Search Bar */}
        {conversations.length > 0 && (
          <View style={styles.searchBar}>
            <Search size={15} color={colors.inkMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search conversations..."
              placeholderTextColor={colors.inkMuted}
              style={styles.searchInput}
            />
            {Boolean(searchQuery) && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={14} color={colors.inkMuted} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Conversation List / Groups */}
        {conversations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <Sparkles size={28} color={colors.primary} />
            </View>
            <ThemedText variant="bodyMd" style={{ fontWeight: "600", textAlign: "center" }}>
              No chat history yet
            </ThemedText>
            <ThemedText variant="caption" color={colors.inkMuted} style={styles.emptyText}>
              Start a new conversation with LifeOS AI to get started.
            </ThemedText>
          </View>
        ) : filteredConversations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ThemedText variant="bodySm" color={colors.inkMuted} style={styles.emptyText}>
              No chats found matching "{searchQuery}"
            </ThemedText>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollList}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {groupedConversations.map((group) => (
              <View key={group.title} style={styles.groupSection}>
                <ThemedText variant="caption" style={styles.groupHeader}>
                  {group.title}
                </ThemedText>

                <View style={styles.groupItems}>
                  {group.items.map((conv) => {
                    const isActive = conv.id === activeConversationId;

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
                        <View style={[styles.convIconWrap, isActive && styles.convIconWrapActive]}>
                          <MessageSquare
                            size={15}
                            color={isActive ? "#FFFFFF" : colors.inkSecondary}
                          />
                        </View>

                        <View style={styles.convInfo}>
                          <ThemedText
                            variant="bodySm"
                            numberOfLines={1}
                            style={[styles.convTitle, isActive && styles.convTitleActive]}
                          >
                            {conv.title || "Untitled Chat"}
                          </ThemedText>
                        </View>

                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => handleDelete(conv.id, conv.title)}
                          style={styles.deleteBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Trash2 size={14} color={colors.inkMuted} />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    maxHeight: 520
  },
  newChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#1E293B",
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: radius.full
  },
  newChatIconWrap: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center"
  },
  newChatBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.canvasSoft,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.hairline
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.ink,
    padding: 0
  },
  scrollList: {
    maxHeight: 380
  },
  scrollContent: {
    paddingBottom: spacing.sm
  },
  groupSection: {
    marginBottom: spacing.sm
  },
  groupHeader: {
    fontWeight: "700",
    color: colors.inkMuted,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
    paddingHorizontal: 4
  },
  groupItems: {
    gap: 4
  },
  convItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
    gap: 10
  },
  convItemActive: {
    backgroundColor: colors.canvasSoft
  },
  convIconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.md,
    backgroundColor: colors.canvasSoft,
    alignItems: "center",
    justifyContent: "center"
  },
  convIconWrapActive: {
    backgroundColor: colors.primary
  },
  convInfo: {
    flex: 1
  },
  convTitle: {
    fontWeight: "500",
    color: colors.ink,
    fontSize: 13.5
  },
  convTitleActive: {
    color: colors.ink,
    fontWeight: "700"
  },
  deleteBtn: {
    padding: 4
  },
  emptyContainer: {
    paddingVertical: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  emptyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4
  },
  emptyText: {
    textAlign: "center",
    maxWidth: 240
  }
});
