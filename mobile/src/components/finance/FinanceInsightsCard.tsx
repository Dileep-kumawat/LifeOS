import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from "react-native";
import { Sparkles, RefreshCw, AlertCircle, Cpu } from "lucide-react-native";
import { Card } from "../ui/Card";
import { ThemedText } from "../ui/ThemedText";
import { MarkdownText } from "../ai/MarkdownText";
import { aiChatService, type FinanceInsightsResponse } from "../../services/aiChatService";
import { colors, radius, spacing } from "../../theme";

export interface FinanceInsightsCardProps {
  onFetchInsights?: (focusArea?: string) => Promise<FinanceInsightsResponse>;
}

export const FinanceInsightsCard: React.FC<FinanceInsightsCardProps> = ({ onFetchInsights }) => {
  const [focusArea, setFocusArea] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FinanceInsightsResponse | null>(null);

  const handleGetInsights = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = onFetchInsights
        ? await onFetchInsights(focusArea.trim() || undefined)
        : await aiChatService.getFinanceInsights(focusArea.trim() || undefined);

      setData(result);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err.message || "Failed to generate financial insights."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <View style={styles.iconWrap}>
            <Sparkles size={16} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText variant="heading3">AI Financial Insights</ThemedText>
            <ThemedText variant="caption" color={colors.inkMuted}>
              Grounded in your logged transactions & budgets
            </ThemedText>
          </View>
        </View>

        {data?.fallbackOccurred && (
          <View style={styles.fallbackBadge}>
            <Cpu size={12} color={colors.warning} />
            <ThemedText variant="caption" style={styles.fallbackBadgeText}>
              Backup Model
            </ThemedText>
          </View>
        )}
      </View>

      {/* Input Row */}
      <View style={styles.inputRow}>
        <TextInput
          value={focusArea}
          onChangeText={setFocusArea}
          placeholder="Optional focus (e.g. dining out, saving more)..."
          placeholderTextColor={colors.inkMuted}
          editable={!loading}
          style={styles.textInput}
        />
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleGetInsights}
          disabled={loading}
          style={[styles.actionBtn, loading && { opacity: 0.7 }]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <Sparkles size={14} color={colors.onPrimary} />
          )}
          <ThemedText variant="caption" style={styles.actionBtnText}>
            {loading ? "Analyzing..." : "Get Insights"}
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Loading State */}
      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={colors.primary} />
          <ThemedText variant="caption" color={colors.primary} style={{ fontWeight: "600" }}>
            Analyzing category totals, budget statuses, and trends...
          </ThemedText>
        </View>
      )}

      {/* Error Banner */}
      {error && (
        <View style={styles.errorBox}>
          <AlertCircle size={16} color={colors.error} />
          <ThemedText variant="caption" color={colors.error} style={{ flex: 1 }}>
            {error}
          </ThemedText>
          <TouchableOpacity activeOpacity={0.7} onPress={handleGetInsights} style={styles.retryBtn}>
            <RefreshCw size={12} color={colors.error} />
            <ThemedText variant="caption" style={{ color: colors.error, fontWeight: "700" }}>
              Retry
            </ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {/* Results Content */}
      {!loading && !error && data?.insights && (
        <View style={styles.insightsResultBox}>
          {data.providerServed && (
            <ThemedText variant="caption" color={colors.inkMuted} style={styles.providerTag}>
              Served by {data.providerServed} {data.fallbackOccurred ? "(via backup fallback)" : ""}
            </ThemedText>
          )}
          <MarkdownText content={data.insights} />
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flex: 1
  },
  iconWrap: {
    padding: 6,
    backgroundColor: "#E0F2FE",
    borderRadius: radius.md
  },
  fallbackBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full
  },
  fallbackBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#B45309"
  },
  inputRow: {
    flexDirection: "row",
    gap: spacing.xs
  },
  textInput: {
    flex: 1,
    height: 38,
    backgroundColor: colors.canvasSoft,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    fontSize: 12,
    color: colors.ink
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    justifyContent: "center"
  },
  actionBtnText: {
    color: colors.onPrimary,
    fontWeight: "700"
  },
  loadingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.canvasSoft,
    padding: spacing.sm,
    borderRadius: radius.md
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: "#FEF2F2",
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#FECACA"
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  insightsResultBox: {
    backgroundColor: colors.canvasSoft,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    gap: 4
  },
  providerTag: {
    fontSize: 10,
    fontFamily: "monospace",
    marginBottom: 4
  }
});
