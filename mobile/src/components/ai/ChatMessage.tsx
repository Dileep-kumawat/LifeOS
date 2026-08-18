import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import {
  Sparkles,
  AlertCircle,
  Wrench,
  CheckCircle2,
  XCircle,
  Cpu
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

  return (
    <View style={styles.assistantContainer}>
      {/* Retrying with Backup Model Notification */}
      {backupModelStatus && (
        <View style={styles.backupModelBadge}>
          <Cpu size={14} color={colors.warning} />
          <ThemedText variant="caption" color={colors.warning} style={styles.backupModelText}>
            {backupModelStatus}
          </ThemedText>
        </View>
      )}

      <View style={styles.assistantRow}>
        {/* Sparkles Avatar */}
        <View style={styles.assistantAvatar}>
          <Sparkles size={16} color={colors.onPrimary} />
        </View>

        {/* Message Content Container */}
        <View style={styles.assistantBody}>
          <View style={styles.headerMeta}>
            <ThemedText variant="caption" style={styles.agentName}>
              LifeOS AI
            </ThemedText>
            {timeString ? (
              <ThemedText variant="caption" color={colors.inkMuted}>
                {timeString}
              </ThemedText>
            ) : null}
          </View>

          {/* Uncertainty Callout (FR-2.6) */}
          {isUncertainty ? (
            <View style={styles.uncertaintyCard}>
              <AlertCircle size={18} color="#D97706" style={styles.alertIcon} />
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

          {/* Tool Call Cards */}
          {toolCallData && (
            <View style={styles.toolCardContainer}>
              {/* 1. Pending Confirmation */}
              {toolCallData.status === "pending_confirmation" && (
                <View style={styles.toolPendingCard}>
                  <View style={styles.toolPendingHeader}>
                    <View style={styles.toolIconWrap}>
                      <Wrench size={18} color={colors.primary} />
                    </View>
                    <View style={styles.toolPendingInfo}>
                      <ThemedText variant="caption" style={styles.toolProposedTitle}>
                        Proposed Action
                      </ThemedText>
                      <ThemedText variant="caption" color={colors.inkSecondary} numberOfLines={1}>
                        Tool: <ThemedText variant="caption" style={styles.toolNameTag}>{toolCallData.toolName}</ThemedText>
                      </ThemedText>
                    </View>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => onOpenConfirmation?.(message)}
                    style={styles.reviewActionBtn}
                  >
                    <ThemedText variant="caption" style={styles.reviewActionBtnText}>
                      Review Action
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              )}

              {/* 2. Executed */}
              {toolCallData.status === "executed" && (
                <View style={styles.toolExecutedCard}>
                  <CheckCircle2 size={16} color={colors.success} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <ThemedText variant="bodySm" style={{ fontWeight: "700", color: "#065F46" }}>
                      Action Executed: <ThemedText variant="caption" style={styles.toolNameTag}>{toolCallData.toolName}</ThemedText>
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
                  <XCircle size={16} color={colors.inkMuted} />
                  <ThemedText variant="caption" color={colors.inkMuted} style={{ flex: 1 }}>
                    Action cancelled by user ({toolCallData.toolName})
                  </ThemedText>
                </View>
              )}

              {/* 4. Failed */}
              {toolCallData.status === "failed" && (
                <View style={styles.toolFailedCard}>
                  <AlertCircle size={16} color={colors.error} />
                  <ThemedText variant="caption" color={colors.error} style={{ flex: 1 }}>
                    {toolCallData.error || "Action execution failed."}
                  </ThemedText>
                </View>
              )}
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
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.md
  },
  userBubble: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderTopRightRadius: radius.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxWidth: "85%",
    borderWidth: 1,
    borderColor: colors.hairline,
    ...shadows.card
  },
  userText: {
    color: colors.ink,
    lineHeight: 20
  },
  assistantContainer: {
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.md
  },
  backupModelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#FDE68A"
  },
  backupModelText: {
    fontWeight: "600"
  },
  assistantRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-start"
  },
  assistantAvatar: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.secondary, // Deep indigo per DESIGN.md
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
    letterSpacing: -0.1
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
    marginBottom: 2,
    borderRadius: 2
  },
  uncertaintyCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
    backgroundColor: "#FEF3C7",
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
    marginTop: spacing.xs
  },
  toolPendingCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.primary,
    gap: spacing.xs
  },
  toolPendingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  toolIconWrap: {
    padding: 6,
    backgroundColor: colors.canvasSoft,
    borderRadius: radius.sm
  },
  toolPendingInfo: {
    flex: 1
  },
  toolProposedTitle: {
    fontWeight: "700",
    color: colors.ink,
    textTransform: "uppercase"
  },
  toolNameTag: {
    fontFamily: "monospace",
    backgroundColor: colors.canvasSoft,
    paddingHorizontal: 4,
    borderRadius: radius.xs,
    fontWeight: "600"
  },
  reviewActionBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    borderRadius: radius.sm,
    alignItems: "center",
    marginTop: 2
  },
  reviewActionBtnText: {
    color: colors.onPrimary,
    fontWeight: "700"
  },
  toolExecutedCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
    backgroundColor: "#ECFDF5",
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#A7F3D0"
  },
  toolCancelledCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.canvasSoft,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline
  },
  toolFailedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: "#FEE2E2",
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#FECACA"
  }
});
