import { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Keyboard
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowUp,
  Plus,
  History,
  WifiOff,
  Sparkles,
  SquarePen,
  ChevronDown,
  Calendar,
  Target,
  DollarSign,
  FileText,
  Mic,
  Square,
  GraduationCap
} from "lucide-react-native";
import { ThemedText } from "../../components/ui/ThemedText";
import { ChatMessage } from "../../components/ai/ChatMessage";
import { ToolConfirmationModal } from "../../components/ai/ToolConfirmationModal";
import { ConversationHistoryModal } from "../../components/ai/ConversationHistoryModal";
import { useSocketChat } from "../../services/useSocketChat";
import { useDockHeight } from "../../navigation/FloatingDock";
import { colors, radius, spacing, shadows } from "../../theme";

interface PromptSuggestion {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  prompt: string;
}

const SUGGESTIONS: PromptSuggestion[] = [
  {
    id: "schedule",
    icon: <Calendar size={18} color={colors.primary} />,
    title: "Review today's schedule",
    subtitle: "Check events, tasks & upcoming meetings",
    prompt: "What are my scheduled events and meetings for today?"
  },
  {
    id: "study_plan",
    icon: <GraduationCap size={18} color={colors.primary} />,
    title: "Generate AI study plan",
    subtitle: "Create syllabus schedule & calendar sessions",
    prompt: "Generate an AI study plan for my upcoming exam."
  },
  {
    id: "habits",
    icon: <Target size={18} color={colors.accentGreen} />,
    title: "Check habit streaks",
    subtitle: "See daily goals and progress",
    prompt: "Show my habit streaks and what goals are pending today."
  },
  {
    id: "finance",
    icon: <DollarSign size={18} color={colors.accentOrange} />,
    title: "Analyze monthly budget",
    subtitle: "Overview of spending and balance",
    prompt: "Give me an overview of my recent transactions and monthly budget."
  },
  {
    id: "note",
    icon: <FileText size={18} color={colors.accentPurple} />,
    title: "Draft a reflection note",
    subtitle: "Capture thoughts & summaries",
    prompt: "Help me write a daily reflection note in my notebook."
  }
];

export function ChatScreen() {
  const insets = useSafeAreaInsets();
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
  const [showQuickPrompts, setShowQuickPrompts] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const dockHeight = useDockHeight();

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setIsKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setIsKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Auto-scroll to end on new messages or streaming chunks
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, messages[messages.length - 1]?.content]);

  const handleSend = (text?: string) => {
    const textToSend = text || input;
    if (!textToSend.trim() || !isOnline || isStreaming) return;
    sendMessage(textToSend);
    if (!text) setInput("");
  };

  const handleSuggestionPress = (prompt: string) => {
    if (!isOnline || isStreaming) return;
    handleSend(prompt);
  };

  const activeConv = conversations.find((c) => c.id === activeConversationId);
  const convTitle = activeConv ? activeConv.title : "LifeOS AI";

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      {/* Top Header - ChatGPT Mobile Style */}
      <View style={styles.topHeader}>
        {/* Left: History / Drawer Button */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setIsHistoryModalOpen(true)}
          style={styles.headerIconButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <History size={20} color={colors.ink} />
        </TouchableOpacity>

        {/* Center: Model Selector Pill */}
        <View style={styles.modelPill}>
          <ThemedText variant="bodySm" style={styles.modelPillText} numberOfLines={1}>
            {activeConversationId ? convTitle : "LifeOS Assistant"}
          </ThemedText>
          <ChevronDown size={14} color={colors.inkMuted} />
        </View>

        {/* Right: New Chat Button */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={newChat}
          style={styles.headerIconButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <SquarePen size={20} color={colors.ink} />
        </TouchableOpacity>
      </View>

      {/* Offline Notice Banner */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <WifiOff size={15} color={colors.error} />
          <ThemedText variant="caption" color={colors.error} style={{ flex: 1 }}>
            AI Assistant is connected-only. Please connect to the internet.
          </ThemedText>
        </View>
      )}

      {/* Main Chat Area */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        {isLoadingHistory ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <ThemedText variant="caption" color={colors.inkMuted}>
              Loading conversation...
            </ThemedText>
          </View>
        ) : messages.length === 0 ? (
          /* ChatGPT Mobile Style Start Screen */
          <ScrollView
            contentContainerStyle={styles.startScreenContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.startHero}>
              <View style={styles.aiOrbContainer}>
                <Sparkles size={32} color="#FFFFFF" />
              </View>
              <ThemedText variant="heading2" style={styles.startHeroTitle}>
                What can I help with today?
              </ThemedText>
              <ThemedText variant="bodySm" color={colors.inkMuted} style={styles.startHeroSubtitle}>
                Ask about your schedule, habits, finance, and notes — or automate your day.
              </ThemedText>
            </View>

            {/* Curated Suggestion Prompt Cards */}
            <View style={styles.suggestionsGrid}>
              {SUGGESTIONS.map((sug) => (
                <TouchableOpacity
                  key={sug.id}
                  activeOpacity={0.7}
                  onPress={() => handleSuggestionPress(sug.prompt)}
                  style={styles.suggestionCard}
                >
                  <View style={styles.suggestionIconWrap}>{sug.icon}</View>
                  <View style={styles.suggestionTextWrap}>
                    <ThemedText variant="bodySm" style={styles.suggestionTitle}>
                      {sug.title}
                    </ThemedText>
                    <ThemedText variant="caption" color={colors.inkMuted} numberOfLines={1}>
                      {sug.subtitle}
                    </ThemedText>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
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

        {/* Quick Suggestion Chips Bar when in chat */}
        {showQuickPrompts && (
          <View style={styles.quickPromptsBar}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickPromptsContent}
            >
              {SUGGESTIONS.map((sug) => (
                <TouchableOpacity
                  key={sug.id}
                  activeOpacity={0.7}
                  onPress={() => {
                    handleSuggestionPress(sug.prompt);
                    setShowQuickPrompts(false);
                  }}
                  style={styles.quickPromptChip}
                >
                  <ThemedText variant="caption" style={styles.quickPromptText}>
                    {sug.title}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Signature ChatGPT Bottom Capsule Bar */}
        <View
          style={[
            styles.bottomBarContainer,
            {
              paddingBottom: isKeyboardVisible
                ? Math.max(insets.bottom, 10)
                : dockHeight + 4
            }
          ]}
        >
          <View style={styles.inputCapsule}>
            {/* Plus / Quick Actions Button */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowQuickPrompts(!showQuickPrompts)}
              style={styles.plusActionButton}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Plus size={18} color={showQuickPrompts ? colors.primary : colors.inkSecondary} />
            </TouchableOpacity>

            {/* Dynamic Multiline Text Input */}
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={!isOnline ? "Connect to internet to chat..." : "Message LifeOS AI..."}
              placeholderTextColor={colors.inkMuted}
              editable={isOnline && !isStreaming}
              style={styles.capsuleInput}
              multiline
              maxLength={2000}
            />

            {/* Right Action: Send Button (ArrowUp) / Stop Button / Mic Icon */}
            {isStreaming ? (
              <View style={[styles.capsuleActionBtn, styles.stopBtn]}>
                <Square size={12} color="#FFFFFF" fill="#FFFFFF" />
              </View>
            ) : input.trim().length > 0 ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleSend()}
                disabled={!isOnline}
                style={[styles.capsuleActionBtn, styles.sendActiveBtn]}
              >
                <ArrowUp size={18} color="#FFFFFF" strokeWidth={2.6} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowQuickPrompts(!showQuickPrompts)}
                style={styles.capsuleActionBtn}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Mic size={19} color={colors.inkMuted} />
              </TouchableOpacity>
            )}
          </View>
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

      {/* Conversation History Modal / Drawer */}
      <ConversationHistoryModal
        visible={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelect={(id) => selectConversation(id)}
        onNewChat={newChat}
        onDelete={(id) => deleteConversation(id)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvasSoft
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.canvasSoft
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    ...shadows.card
  },
  modelPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    maxWidth: "60%",
    ...shadows.card
  },
  modelPillText: {
    fontWeight: "700",
    color: colors.ink,
    fontSize: 14,
    letterSpacing: -0.2
  },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    marginHorizontal: spacing.md,
    marginBottom: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#FECACA"
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs
  },
  startScreenContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl
  },
  startHero: {
    alignItems: "center",
    marginBottom: spacing.xl
  },
  aiOrbContainer: {
    width: 58,
    height: 58,
    borderRadius: radius.full,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4
  },
  startHeroTitle: {
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 6,
    letterSpacing: -0.4
  },
  startHeroSubtitle: {
    textAlign: "center",
    fontSize: 14,
    maxWidth: 290,
    lineHeight: 20
  },
  suggestionsGrid: {
    gap: 10
  },
  suggestionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.lg,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.hairline,
    ...shadows.card
  },
  suggestionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.canvasSoft,
    alignItems: "center",
    justifyContent: "center"
  },
  suggestionTextWrap: {
    flex: 1
  },
  suggestionTitle: {
    fontWeight: "600",
    color: colors.ink,
    fontSize: 14,
    marginBottom: 2
  },
  messagesList: {
    paddingVertical: spacing.sm
  },
  quickPromptsBar: {
    paddingVertical: 6,
    backgroundColor: colors.canvasSoft
  },
  quickPromptsContent: {
    paddingHorizontal: spacing.md,
    gap: 8
  },
  quickPromptChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.hairline,
    ...shadows.card
  },
  quickPromptText: {
    color: colors.inkSecondary,
    fontWeight: "600",
    fontSize: 12
  },
  bottomBarContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: 6,
    backgroundColor: colors.canvasSoft
  },
  inputCapsule: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 26,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.hairline,
    ...shadows.raised
  },
  plusActionButton: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: colors.canvasSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6
  },
  capsuleInput: {
    flex: 1,
    minHeight: 38,
    maxHeight: 120,
    paddingVertical: 8,
    paddingHorizontal: 4,
    fontSize: 15,
    color: colors.ink,
    lineHeight: 20
  },
  capsuleActionBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4
  },
  sendActiveBtn: {
    backgroundColor: "#0F172A" // ChatGPT-style solid dark circular send button
  },
  stopBtn: {
    backgroundColor: "#0F172A"
  }
});
