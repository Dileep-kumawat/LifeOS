import { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from "react-native";
import { Send, Plus, History, WifiOff, Sparkles } from "lucide-react-native";
import { ScreenContainer } from "../../components/ui/ScreenContainer";
import { ThemedText } from "../../components/ui/ThemedText";
import { ChatMessage } from "../../components/ai/ChatMessage";
import { ToolConfirmationModal } from "../../components/ai/ToolConfirmationModal";
import { ConversationHistoryModal } from "../../components/ai/ConversationHistoryModal";
import { useSocketChat } from "../../services/useSocketChat";
import { colors, radius, spacing } from "../../theme";

export function ChatScreen() {
  const {
    isOnline,
    conversations,
    activeConversationId,
    messages,
    isStreaming,
    backupModelStatus,
    pendingToolCallMessage,
    isExecutingTool,
    isLoadingHistory,
    setPendingToolCallMessage,
    selectConversation,
    newChat,
    deleteConversation,
    sendMessage,
    confirmToolCall,
    cancelToolCall
  } = useSocketChat();

  const [input, setInput] = useState("");
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Auto-scroll to end on new messages or streaming chunks
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, messages[messages.length - 1]?.content]);

  const handleSend = () => {
    if (!input.trim() || !isOnline || isStreaming) return;
    sendMessage(input);
    setInput("");
  };

  const activeConv = conversations.find((c) => c.id === activeConversationId);
  const convTitle = activeConv ? activeConv.title : "New Conversation";

  return (
    <ScreenContainer scrollable={false}>
      {/* Header Toolbar */}
      <View style={styles.header}>
        <View style={styles.headerTitleWrap}>
          <ThemedText variant="heading3" numberOfLines={1} style={styles.headerTitle}>
            {convTitle}
          </ThemedText>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setIsHistoryModalOpen(true)}
            style={styles.headerBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <History size={18} color={colors.ink} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={newChat}
            style={[styles.headerBtn, styles.newChatHeaderBtn]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Plus size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Offline Notice Banner (Connected-only rule) */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <WifiOff size={16} color={colors.error} />
          <ThemedText variant="caption" color={colors.error} style={{ flex: 1 }}>
            AI Assistant requires an active internet connection. Chat is connected-only.
          </ThemedText>
        </View>
      )}

      {/* Messages List / Loading / Empty */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {isLoadingHistory ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <ThemedText variant="caption" color={colors.inkMuted}>
              Loading conversation history...
            </ThemedText>
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <Sparkles size={36} color={colors.primary} />
            </View>
            <ThemedText variant="heading2" style={{ textAlign: "center" }}>
              How can I help you today?
            </ThemedText>
            <ThemedText
              variant="bodySm"
              color={colors.inkMuted}
              style={{ textAlign: "center", maxWidth: 280 }}
            >
              Ask about your schedule, habits, notes, or financial trends — or ask me to schedule an event or habit for you.
            </ThemedText>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item, index) => item.id || `msg_${index}`}
            renderItem={({ item, index }) => (
              <ChatMessage
                message={item}
                onOpenConfirmation={(msg) => setPendingToolCallMessage(msg)}
                backupModelStatus={index === messages.length - 1 ? backupModelStatus : null}
              />
            )}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        )}

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={
              !isOnline
                ? "Connect to internet to chat..."
                : "Ask LifeOS AI anything..."
            }
            placeholderTextColor={colors.inkMuted}
            editable={isOnline && !isStreaming}
            style={styles.textInput}
            multiline
            maxLength={2000}
          />

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSend}
            disabled={!input.trim() || !isOnline || isStreaming}
            style={[
              styles.sendBtn,
              (!input.trim() || !isOnline || isStreaming) && styles.sendBtnDisabled
            ]}
          >
            {isStreaming ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <Send size={16} color={colors.onPrimary} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Tool Confirmation Modal */}
      <ToolConfirmationModal
        visible={Boolean(pendingToolCallMessage)}
        toolCall={pendingToolCallMessage?.toolCallData || null}
        onConfirm={() => {
          if (pendingToolCallMessage) {
            confirmToolCall(pendingToolCallMessage);
          }
        }}
        onCancel={() => {
          if (pendingToolCallMessage) {
            cancelToolCall(pendingToolCallMessage);
          }
        }}
        isExecuting={isExecutingTool}
      />

      {/* Conversation History Modal */}
      <ConversationHistoryModal
        visible={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelect={(id) => selectConversation(id)}
        onNewChat={newChat}
        onDelete={(id) => deleteConversation(id)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline
  },
  headerTitleWrap: {
    flex: 1,
    marginRight: spacing.sm
  },
  headerTitle: {
    color: colors.ink
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  headerBtn: {
    padding: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.canvasSoft
  },
  newChatHeaderBtn: {
    backgroundColor: "#E0F2FE"
  },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: "#FECACA"
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs
  },
  messagesList: {
    paddingVertical: spacing.sm
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    backgroundColor: colors.surface
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: colors.canvasSoft,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.hairline
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  sendBtnDisabled: {
    opacity: 0.4
  }
});
