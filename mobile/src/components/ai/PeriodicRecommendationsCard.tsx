import { useState } from "react";
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import {
  Sparkles,
  RefreshCw,
  AlertCircle,
  Calendar,
  ArrowRight,
  Activity,
  Wallet,
  CheckCircle2,
  TrendingUp
} from "lucide-react-native";
import type { Recommendation, RecommendationItem, RecommendationPeriod } from "@lifeos/shared";
import { Card } from "../ui/Card";
import { ThemedText } from "../ui/ThemedText";
import { colors, radius, spacing } from "../../theme";

export interface PeriodicRecommendationsCardProps {
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  generated?: boolean;
  period?: RecommendationPeriod;
  onPeriodChange?: (period: RecommendationPeriod) => void;
  recommendation?: Recommendation | null;
}

export function PeriodicRecommendationsCard({
  isLoading = false,
  isError = false,
  onRetry,
  generated = true,
  period = "weekly",
  onPeriodChange,
  recommendation
}: PeriodicRecommendationsCardProps) {
  const [internalPeriod, setInternalPeriod] = useState<RecommendationPeriod>(period);
  const activePeriod = onPeriodChange ? period : internalPeriod;

  const handlePeriodChange = (p: RecommendationPeriod) => {
    if (onPeriodChange) {
      onPeriodChange(p);
    } else {
      setInternalPeriod(p);
    }
  };

  const getDomainIcon = (domain: string) => {
    switch (domain) {
      case "finance":
        return <Wallet size={13} color={colors.primary} />;
      case "habits":
        return <CheckCircle2 size={13} color={colors.success} />;
      case "productivity":
        return <Activity size={13} color={colors.accentOrange} />;
      default:
        return <TrendingUp size={13} color={colors.secondary} />;
    }
  };

  const getImpactBadgeStyle = (impact: string) => {
    switch (impact) {
      case "high":
        return { bg: "#FEF2F2", text: "#B91C1C", border: "#FECACA" };
      case "medium":
        return { bg: "#FFFBEB", text: "#B45309", border: "#FDE68A" };
      default:
        return { bg: "#F8FAFC", text: "#475569", border: "#E2E8F0" };
    }
  };

  // 1. Loading State
  if (isLoading) {
    return (
      <Card style={styles.card}>
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <ThemedText variant="caption" color={colors.inkMuted}>
            Loading {activePeriod} AI recommendations...
          </ThemedText>
        </View>
      </Card>
    );
  }

  // 2. Error Fallback State
  if (isError) {
    return (
      <Card style={[styles.card, styles.errorCard]}>
        <View style={styles.errorHeader}>
          <View style={styles.errorIconWrap}>
            <AlertCircle size={15} color={colors.error} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText variant="bodySm" style={{ fontWeight: "700", color: colors.error }}>
              Could not load {activePeriod} recommendations
            </ThemedText>
            <ThemedText variant="caption" color={colors.inkMuted}>
              An error occurred fetching recommendations.
            </ThemedText>
          </View>
          {onRetry && (
            <TouchableOpacity activeOpacity={0.7} onPress={onRetry} style={styles.retryBtn}>
              <RefreshCw size={11} color={colors.ink} />
              <ThemedText variant="caption" style={styles.retryBtnText}>
                Retry
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    );
  }

  // 3. Scheduled / Not Yet Generated State
  if (!generated || !recommendation) {
    return (
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.titleRow}>
            <View style={styles.sparklesWrap}>
              <Sparkles size={15} color={colors.primary} />
            </View>
            <ThemedText variant="title" style={styles.cardTitle}>
              {activePeriod === "weekly" ? "Weekly" : "Monthly"} AI Recommendations
            </ThemedText>
          </View>

          {/* Cadence Toggle */}
          <View style={styles.miniToggleContainer}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handlePeriodChange("weekly")}
              style={[
                styles.miniToggleBtn,
                activePeriod === "weekly" && styles.miniToggleBtnActive
              ]}
            >
              <ThemedText
                variant="caption"
                style={[
                  styles.miniToggleText,
                  activePeriod === "weekly" && styles.miniToggleTextActive
                ]}
              >
                Weekly
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handlePeriodChange("monthly")}
              style={[
                styles.miniToggleBtn,
                activePeriod === "monthly" && styles.miniToggleBtnActive
              ]}
            >
              <ThemedText
                variant="caption"
                style={[
                  styles.miniToggleText,
                  activePeriod === "monthly" && styles.miniToggleTextActive
                ]}
              >
                Monthly
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        <ThemedText variant="caption" color={colors.inkMuted} style={{ marginTop: 4, lineHeight: 18 }}>
          {activePeriod === "weekly"
            ? "Scheduled weekly recommendation runs every Sunday at 08:00 evaluating your past 7 completed days."
            : "Scheduled monthly recommendation runs on the 1st of every month at 08:00 evaluating the completed month."}
        </ThemedText>
      </Card>
    );
  }

  const { recommendations = [], periodStart, periodEnd } = recommendation;

  return (
    <Card style={styles.card}>
      {/* Header Bar */}
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <View style={styles.sparklesWrap}>
            <Sparkles size={15} color={colors.primary} />
          </View>
          <View>
            <ThemedText variant="title" style={styles.cardTitle}>
              AI Recommendations
            </ThemedText>
            <ThemedText variant="caption" color={colors.inkMuted}>
              Grounded {activePeriod} metrics
            </ThemedText>
          </View>
        </View>

        {/* Cadence Segment Switcher */}
        <View style={styles.miniToggleContainer}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handlePeriodChange("weekly")}
            style={[
              styles.miniToggleBtn,
              activePeriod === "weekly" && styles.miniToggleBtnActive
            ]}
          >
            <ThemedText
              variant="caption"
              style={[
                styles.miniToggleText,
                activePeriod === "weekly" && styles.miniToggleTextActive
              ]}
            >
              Weekly
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handlePeriodChange("monthly")}
            style={[
              styles.miniToggleBtn,
              activePeriod === "monthly" && styles.miniToggleBtnActive
            ]}
          >
            <ThemedText
              variant="caption"
              style={[
                styles.miniToggleText,
                activePeriod === "monthly" && styles.miniToggleTextActive
              ]}
            >
              Monthly
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Date Range Badge */}
      <View style={styles.dateBadgeRow}>
        <Calendar size={11} color={colors.primary} />
        <ThemedText variant="caption" style={styles.dateBadgeText}>
          {periodStart} → {periodEnd}
        </ThemedText>
      </View>

      {/* Recommendations List */}
      {recommendations.length === 0 ? (
        <ThemedText variant="caption" color={colors.inkMuted} style={styles.emptyText}>
          No recommendations generated for this period.
        </ThemedText>
      ) : (
        <View style={styles.recList}>
          {recommendations.map((item: RecommendationItem, idx: number) => {
            const impactStyle = getImpactBadgeStyle(item.impact);

            return (
              <View key={item.id || idx} style={styles.recItemCard}>
                {/* Meta Header: Domain + Category + Impact */}
                <View style={styles.metaRow}>
                  <View style={styles.domainTagRow}>
                    {getDomainIcon(item.domain)}
                    <ThemedText variant="caption" style={styles.categoryLabel} numberOfLines={1}>
                      {item.category || item.domain}
                    </ThemedText>
                  </View>

                  <View
                    style={[
                      styles.impactBadge,
                      { backgroundColor: impactStyle.bg, borderColor: impactStyle.border }
                    ]}
                  >
                    <ThemedText
                      variant="caption"
                      style={[styles.impactBadgeText, { color: impactStyle.text }]}
                    >
                      {item.impact}
                    </ThemedText>
                  </View>
                </View>

                {/* Title & Message */}
                <ThemedText variant="bodySm" style={styles.recTitle}>
                  {item.title}
                </ThemedText>
                <ThemedText variant="caption" color={colors.inkSecondary} style={styles.recMessage}>
                  {item.message}
                </ThemedText>

                {/* Actionable Step Card */}
                <View style={styles.actionStepCard}>
                  <ArrowRight size={13} color={colors.primary} style={{ marginTop: 2 }} />
                  <ThemedText variant="caption" style={styles.actionStepText}>
                    {item.actionableStep}
                  </ThemedText>
                </View>

                {/* Grounded Metric Cue */}
                {item.metricGrounded ? (
                  <View style={styles.metricRow}>
                    <ThemedText variant="caption" color={colors.inkMuted} style={styles.metricLabel}>
                      Metric:
                    </ThemedText>
                    <ThemedText
                      variant="caption"
                      color={colors.ink}
                      numberOfLines={1}
                      style={styles.metricValue}
                    >
                      {item.metricGrounded}
                    </ThemedText>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.xs
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md
  },
  errorCard: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA"
  },
  errorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  errorIconWrap: {
    padding: 6,
    backgroundColor: "#FEE2E2",
    borderRadius: radius.full
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.hairline
  },
  retryBtnText: {
    fontWeight: "600",
    fontSize: 11
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.xs
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flex: 1
  },
  sparklesWrap: {
    padding: 6,
    backgroundColor: "rgba(0, 117, 222, 0.1)",
    borderRadius: radius.md
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "700"
  },
  miniToggleContainer: {
    flexDirection: "row",
    backgroundColor: colors.canvasSoft,
    borderRadius: radius.full,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.hairline
  },
  miniToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full
  },
  miniToggleBtnActive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1
  },
  miniToggleText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.inkMuted
  },
  miniToggleTextActive: {
    color: colors.primary,
    fontWeight: "700"
  },
  dateBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: "rgba(0, 117, 222, 0.06)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    marginBottom: 4
  },
  dateBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.primary
  },
  emptyText: {
    fontStyle: "italic",
    paddingVertical: spacing.xs
  },
  recList: {
    gap: spacing.xs + 2
  },
  recItemCard: {
    backgroundColor: colors.canvasSoft,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.sm,
    gap: 6
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  domainTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1
  },
  categoryLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: colors.inkMuted
  },
  impactBadge: {
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: radius.full,
    borderWidth: 1
  },
  impactBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "capitalize"
  },
  recTitle: {
    fontWeight: "700",
    color: colors.ink,
    fontSize: 13.5
  },
  recMessage: {
    lineHeight: 17,
    color: colors.inkSecondary
  },
  actionStepCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.xs + 2,
    marginTop: 2
  },
  actionStepText: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: "600",
    color: colors.ink,
    lineHeight: 16
  },
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
    marginTop: 2
  },
  metricLabel: {
    fontSize: 10.5
  },
  metricValue: {
    fontSize: 10.5,
    fontFamily: "monospace",
    fontWeight: "600"
  }
});
