import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import {
  Sparkles,
  AlertCircle,
  Wrench,
  CheckCircle2,
  XCircle,
  Cpu,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  Calendar,
  Target,
  FileText
} from "lucide-react-native";
import type { ChatMessage as ChatMessageType } from "../../services/aiChatService";
import { ThemedText } from "../ui/ThemedText";
import { MarkdownText } from "./MarkdownText";
import { colors, radius, spacing, shadows } from "../../theme";

export interface ChatMessageProps {
  message: ChatMessageType;
  onOpenConfirmation?: (message: ChatMessageType) => void;
  backupModelStatus?: string | null;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onOpenConfirmation,
  backupModelStatus
}) => {
  const { role, content, toolCallData, isStreaming, createdAt } = message;
  const isUser = role === "user";
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isUncertainty =
    !isUser &&
    (content.toLowerCase().includes("don't have enough data in your account") ||
      content.toLowerCase().includes("insufficient data"));

  if (isUser) {
    return (
      <View style={styles.userRow}>
        <View style={styles.userBubble}>
          <ThemedText variant="bodyMd" style={styles.userText}>
            {content}
          </ThemedText>
        </View>
      </View>
    );
  }

  const timeString = createdAt
    ? new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  const getToolIcon = (toolName: string) => {
    if (toolName.includes("calendar")) return <Calendar size={15} color={colors.primary} />;
    if (toolName.includes("habit")) return <Target size={15} color={colors.accentGreen} />;
    if (toolName.includes("note")) return <FileText size={15} color={colors.accentPurple} />;
    return <Wrench size={15} color={colors.primary} />;
  };

  return (
    <View style={styles.assistantContainer}>
      {/* Retrying with Backup Model Notification */}
      {backupModelStatus && (
        <View style={styles.backupModelBadge}>
          <Cpu size={13} color={colors.warning} />
          <ThemedText variant="caption" color={colors.warning} style={styles.backupModelText}>
            {backupModelStatus}
          </ThemedText>
        </View>
      )}

      <View style={styles.assistantRow}>
        {/* Sleek Minimalist AI Avatar */}
        <View style={styles.assistantAvatar}>
          <Sparkles size={15} color="#FFFFFF" />
        </View>

        {/* Message Content Container */}
        <View style={styles.assistantBody}>
          <View style={styles.headerMeta}>
            <ThemedText variant="caption" style={styles.agentName}>
              LifeOS AI
            </ThemedText>
            {timeString ? (
              <ThemedText variant="caption" color={colors.inkMuted} style={styles.timeText}>
                {timeString}
              </ThemedText>
            ) : null}
          </View>

          {/* Uncertainty Callout */}
          {isUncertainty ? (
            <View style={styles.uncertaintyCard}>
              <AlertCircle size={17} color="#D97706" style={styles.alertIcon} />
              <View style={{ flex: 1 }}>
                <ThemedText variant="bodySm" style={styles.uncertaintyText}>
                  {content}
                </ThemedText>
              </View>
            </View>
          ) : (
            (content || isStreaming) && (
              <View style={styles.contentWrap}>
                {content ? <MarkdownText content={content} /> : null}
                {isStreaming && <View style={styles.streamingCursor} />}
              </View>
            )
          )}

          {/* Tool Call Cards - ChatGPT Canvas Style */}
          {toolCallData && (
            <View style={styles.toolCardContainer}>
              {/* 1. Pending Confirmation */}
              {toolCallData.status === "pending_confirmation" && (
                <View style={styles.toolPendingCard}>
                  <View style={styles.toolPendingHeader}>
                    <View style={styles.toolIconWrap}>
                      {getToolIcon(toolCallData.toolName)}
                    </View>
                    <View style={styles.toolPendingInfo}>
                      <ThemedText variant="caption" style={styles.toolProposedTitle}>
                        Action Proposed
                      </ThemedText>
                      <ThemedText variant="caption" color={colors.inkMuted} numberOfLines={1}>
                        <ThemedText variant="caption" style={styles.toolNameTag}>{toolCallData.toolName}</ThemedText>
                      </ThemedText>
                    </View>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => onOpenConfirmation?.(message)}
                    style={styles.reviewActionBtn}
                  >
                    <ThemedText variant="caption" style={styles.reviewActionBtnText}>
                      Review & Approve Action
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              )}

              {/* 2. Executed */}
              {toolCallData.status === "executed" && (
                <View style={styles.toolExecutedCard}>
                  <CheckCircle2 size={16} color="#059669" style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <ThemedText variant="bodySm" style={{ fontWeight: "700", color: "#065F46" }}>
                      Executed: <ThemedText variant="caption" style={styles.toolNameTag}>{toolCallData.toolName}</ThemedText>
                    </ThemedText>
                    {toolCallData.result?.message && (
                      <ThemedText variant="caption" color="#047857" style={{ marginTop: 2 }}>
                        {toolCallData.result.message}
                      </ThemedText>
                    )}
                  </View>
                </View>
              )}

              {/* 3. Cancelled */}
              {toolCallData.status === "cancelled" && (
                <View style={styles.toolCancelledCard}>
                  <XCircle size={15} color={colors.inkMuted} />
                  <ThemedText variant="caption" color={colors.inkMuted} style={{ flex: 1 }}>
                    Action cancelled ({toolCallData.toolName})
                  </ThemedText>
                </View>
              )}

              {/* 4. Failed */}
              {toolCallData.status === "failed" && (
                <View style={styles.toolFailedCard}>
                  <AlertCircle size={15} color={colors.error} />
                  <ThemedText variant="caption" color={colors.error} style={{ flex: 1 }}>
                    {toolCallData.error || "Action execution failed."}
                  </ThemedText>
                </View>
              )}
            </View>
          )}

          {/* ChatGPT-style Message Action Bar */}
          {!isStreaming && content && (
            <View style={styles.messageActionsRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleCopy}
                style={styles.actionIconBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {copied ? (
                  <Check size={14} color={colors.success} />
                ) : (
                  <Copy size={14} color={colors.inkMuted} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setFeedback(feedback === "up" ? null : "up")}
                style={styles.actionIconBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <ThumbsUp
                  size={14}
                  color={feedback === "up" ? colors.primary : colors.inkMuted}
                />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setFeedback(feedback === "down" ? null : "down")}
                style={styles.actionIconBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <ThumbsDown
                  size={14}
                  color={feedback === "down" ? colors.error : colors.inkMuted}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  userRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginVertical: 6,
    paddingHorizontal: spacing.md
  },
  userBubble: {
    backgroundColor: "#1E293B", // ChatGPT-style sleek dark container
    borderRadius: 20,
    borderBottomRightRadius: 5,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxWidth: "82%",
    ...shadows.card
  },
  userText: {
    color: "#FFFFFF",
    lineHeight: 21,
    fontSize: 15,
    fontWeight: "400"
  },
  assistantContainer: {
    marginVertical: 6,
    paddingHorizontal: spacing.md
  },
  backupModelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    marginBottom: spacing.xs,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#FDE68A"
  },
  backupModelText: {
    fontWeight: "600",
    fontSize: 12
  },
  assistantRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start"
  },
  assistantAvatar: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2
  },
  assistantBody: {
    flex: 1
  },
  headerMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4
  },
  agentName: {
    fontWeight: "700",
    color: colors.ink,
    fontSize: 13,
    letterSpacing: -0.2
  },
  timeText: {
    fontSize: 11
  },
  contentWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end"
  },
  streamingCursor: {
    width: 6,
    height: 16,
    backgroundColor: colors.primary,
    marginLeft: 4,
    marginBottom: 3,
    borderRadius: 2
  },
  uncertaintyCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
    backgroundColor: "#FFFBEB",
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#FDE68A",
    marginVertical: 4
  },
  alertIcon: {
    marginTop: 2
  },
  uncertaintyText: {
    color: "#92400E",
    fontWeight: "500"
  },
  toolCardContainer: {
    marginTop: 8
  },
  toolPendingCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 12,
    borderWidth: 1.5,
    borderColor: "#93C5FD",
    gap: 8,
    ...shadows.card
  },
  toolPendingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  toolIconWrap: {
    width: 30,
    height: 30,
    borderRadius: radius.md,
    backgroundColor: colors.canvasSoft,
    alignItems: "center",
    justifyContent: "center"
  },
  toolPendingInfo: {
    flex: 1
  },
  toolProposedTitle: {
    fontWeight: "700",
    color: colors.ink,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.2
  },
  toolNameTag: {
    fontFamily: "monospace",
    backgroundColor: colors.canvasSoft,
    paddingHorizontal: 4,
    borderRadius: radius.xs,
    fontWeight: "600",
    fontSize: 11
  },
  reviewActionBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    borderRadius: radius.full,
    alignItems: "center"
  },
  reviewActionBtnText: {
    color: colors.onPrimary,
    fontWeight: "700",
    fontSize: 12
  },
  toolExecutedCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
    backgroundColor: "#ECFDF5",
    padding: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#A7F3D0"
  },
  toolCancelledCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.canvasSoft,
    padding: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline
  },
  toolFailedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: "#FEE2E2",
    padding: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#FECACA"
  },
  messageActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 6,
    paddingTop: 2
  },
  actionIconBtn: {
    padding: 4,
    borderRadius: radius.xs
  }
});
