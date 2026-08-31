import { View, StyleSheet } from "react-native";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  CheckCircle2,
  AlertTriangle,
  XCircle
} from "lucide-react-native";
import { ThemedText } from "../ui/ThemedText";
import { Card } from "../ui/Card";
import { ProgressBar } from "../ui/ProgressBar";
import { CategoryBreakdownChart } from "../finance/FinanceCharts";
import { AnalyticsChart } from "./AnalyticsChart";
import type { FinanceAnalytics } from "@lifeos/shared";
import { colors, spacing, radius } from "../../theme";

interface FinanceAnalyticsViewProps {
  data?: FinanceAnalytics;
  isLoading?: boolean;
}

export function FinanceAnalyticsView({
  data,
  isLoading = false
}: FinanceAnalyticsViewProps) {
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <AnalyticsChart
          type="line"
          xKey="period"
          series={[{ dataKey: "income", name: "Income", color: colors.success }]}
          isLoading={true}
        />
      </View>
    );
  }

  const hasData =
    data &&
    (data.summary.transactionCount > 0 ||
      data.summary.totalIncome > 0 ||
      data.summary.totalExpense > 0 ||
      data.budgetAdherence.budgetsTracked > 0);

  if (!data || !hasData) {
    return (
      <Card style={styles.emptyCard}>
        <View style={styles.emptyIconWrap}>
          <Wallet size={28} color={colors.primary} />
        </View>
        <ThemedText variant="heading3" style={{ marginBottom: 4 }}>
          No Financial Data
        </ThemedText>
        <ThemedText variant="caption" color={colors.inkMuted} style={styles.emptyText}>
          Log income or expense transactions in Finance or configure monthly category budgets to view
          financial analytics.
        </ThemedText>
      </Card>
    );
  }

  // Adapt CategoryBreakdown items for CategoryBreakdownChart
  const expenseCategories = data.categoryBreakdown
    .filter((c) => c.type === "expense" && c.totalAmount > 0)
    .map((c) => ({
      category: c.category,
      amount: c.totalAmount,
      count: c.count,
      percentage: Math.round(c.percentage)
    }));

  const adherenceRatePercent = Math.round((data.budgetAdherence.adherenceRate || 0) * 100);

  return (
    <View style={styles.container}>
      {/* 1. KPI 2x2 Grid */}
      <View style={styles.kpiGrid}>
        {/* Total Income */}
        <Card style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <ThemedText variant="caption" style={styles.kpiLabel}>
              Total Income
            </ThemedText>
            <View style={[styles.kpiIconWrap, { backgroundColor: "rgba(16, 185, 129, 0.1)" }]}>
              <TrendingUp size={14} color={colors.success} />
            </View>
          </View>
          <ThemedText variant="heading2" style={[styles.kpiValue, { color: colors.success }]}>
            ${Math.round(data.summary.totalIncome).toLocaleString()}
          </ThemedText>
          <ThemedText variant="caption" color={colors.inkMuted} style={styles.kpiSub}>
            Inflow across range
          </ThemedText>
        </Card>

        {/* Total Spend */}
        <Card style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <ThemedText variant="caption" style={styles.kpiLabel}>
              Total Spend
            </ThemedText>
            <View style={[styles.kpiIconWrap, { backgroundColor: "rgba(239, 68, 68, 0.1)" }]}>
              <TrendingDown size={14} color={colors.error} />
            </View>
          </View>
          <ThemedText variant="heading2" style={[styles.kpiValue, { color: colors.error }]}>
            ${Math.round(data.summary.totalExpense).toLocaleString()}
          </ThemedText>
          <ThemedText variant="caption" color={colors.inkMuted} style={styles.kpiSub}>
            {data.summary.transactionCount} transactions
          </ThemedText>
        </Card>

        {/* Net Savings */}
        <Card style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <ThemedText variant="caption" style={styles.kpiLabel}>
              Net Savings
            </ThemedText>
            <View style={[styles.kpiIconWrap, { backgroundColor: "rgba(0, 117, 222, 0.1)" }]}>
              <PiggyBank size={14} color={colors.primary} />
            </View>
          </View>
          <ThemedText
            variant="heading2"
            style={[
              styles.kpiValue,
              { color: data.summary.netSavings >= 0 ? colors.primary : colors.error }
            ]}
          >
            ${Math.round(data.summary.netSavings).toLocaleString()}
          </ThemedText>
          <ThemedText variant="caption" color={colors.inkMuted} style={styles.kpiSub}>
            Net cashflow
          </ThemedText>
        </Card>

        {/* Savings Rate */}
        <Card style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <ThemedText variant="caption" style={styles.kpiLabel}>
              Savings Rate
            </ThemedText>
            <View style={[styles.kpiIconWrap, { backgroundColor: "rgba(139, 92, 246, 0.1)" }]}>
              <Wallet size={14} color="#8B5CF6" />
            </View>
          </View>
          <ThemedText variant="heading2" style={styles.kpiValue}>
            {data.summary.savingsRate.toFixed(1)}%
          </ThemedText>
          <ThemedText variant="caption" color={colors.inkMuted} style={styles.kpiSub}>
            {data.summary.savingsRate >= 20 ? "On target" : "Target: >20%"}
          </ThemedText>
        </Card>
      </View>

      {/* 2. Category Breakdown Chart (Phase 4 / Phase 5 style) */}
      <CategoryBreakdownChart
        data={expenseCategories}
        totalExpense={data.summary.totalExpense}
      />

      {/* 3. Spend & Income Trend Line Chart */}
      <AnalyticsChart
        type="line"
        title="Income & Spend Trend"
        subtitle="Trajectory over selected period"
        xKey="period"
        series={[
          { dataKey: "income", name: "Income", color: colors.success },
          { dataKey: "expense", name: "Expense", color: "#EA580C" }
        ]}
        data={data.trend}
        yAxisFormatter={(val: number) => `$${val}`}
        xAxisFormatter={(val: string) => {
          if (!val) return "";
          const parts = val.split("-");
          if (parts.length === 3) return `${parts[1]}/${parts[2]}`;
          return val;
        }}
      />

      {/* 4. Budget Adherence Section */}
      <Card style={styles.sectionCard}>
        <View style={styles.budgetHeaderRow}>
          <View style={{ flex: 1 }}>
            <ThemedText variant="heading3">Budget Adherence</ThemedText>
            <ThemedText variant="caption" color={colors.inkMuted}>
              {data.budgetAdherence.budgetsOnTrack} of {data.budgetAdherence.budgetsTracked} budgets on track
            </ThemedText>
          </View>

          <View
            style={[
              styles.adherenceBadge,
              adherenceRatePercent >= 80
                ? styles.adherenceBadgeHigh
                : adherenceRatePercent >= 50
                ? styles.adherenceBadgeMid
                : styles.adherenceBadgeLow
            ]}
          >
            <ThemedText
              variant="caption"
              style={[
                styles.adherenceText,
                adherenceRatePercent >= 80
                  ? styles.adherenceTextHigh
                  : adherenceRatePercent >= 50
                  ? styles.adherenceTextMid
                  : styles.adherenceTextLow
              ]}
            >
              {adherenceRatePercent}% Met
            </ThemedText>
          </View>
        </View>

        {data.budgetAdherence.budgets.length === 0 ? (
          <ThemedText
            variant="caption"
            color={colors.inkMuted}
            style={{ textAlign: "center", paddingVertical: spacing.md }}
          >
            No monthly budgets configured.
          </ThemedText>
        ) : (
          <View style={styles.budgetsList}>
            {data.budgetAdherence.budgets.map((b) => {
              const statusConfig = {
                on_track: {
                  label: "On Track",
                  icon: <CheckCircle2 size={12} color={colors.success} />,
                  pillBg: "rgba(16, 185, 129, 0.1)",
                  textColor: colors.success,
                  barColor: colors.success
                },
                warning: {
                  label: "Warning (>85%)",
                  icon: <AlertTriangle size={12} color="#F59E0B" />,
                  pillBg: "rgba(245, 158, 11, 0.1)",
                  textColor: "#F59E0B",
                  barColor: "#F59E0B"
                },
                exceeded: {
                  label: "Exceeded",
                  icon: <XCircle size={12} color={colors.error} />,
                  pillBg: "rgba(239, 68, 68, 0.1)",
                  textColor: colors.error,
                  barColor: colors.error
                }
              }[b.status] || {
                label: b.status,
                icon: null,
                pillBg: colors.canvasSoft,
                textColor: colors.inkMuted,
                barColor: colors.primary
              };

              return (
                <View key={b.budgetId} style={styles.budgetItem}>
                  <View style={styles.budgetRowTop}>
                    <ThemedText variant="bodySm" style={{ fontWeight: "700" }}>
                      {b.category}
                    </ThemedText>
                    <View style={[styles.statusPill, { backgroundColor: statusConfig.pillBg }]}>
                      {statusConfig.icon}
                      <ThemedText
                        variant="caption"
                        style={[styles.statusPillText, { color: statusConfig.textColor }]}
                      >
                        {statusConfig.label}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.budgetAmountsRow}>
                    <ThemedText variant="caption" color={colors.inkMuted}>
                      Spent: ${Math.round(b.actualSpend)} / Limit: ${Math.round(b.limit)}
                    </ThemedText>
                    <ThemedText variant="caption" style={{ fontWeight: "700" }}>
                      {b.percentUsed}%
                    </ThemedText>
                  </View>

                  <ProgressBar
                    progress={Math.min(100, b.percentUsed)}
                    height={6}
                    color={statusConfig.barColor}
                    backgroundColor={colors.hairline}
                  />
                </View>
              );
            })}
          </View>
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm
  },
  loadingContainer: {
    padding: spacing.md
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: spacing.md
  },
  emptyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.canvasSoft,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm
  },
  emptyText: {
    textAlign: "center",
    maxWidth: 280
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  kpiCard: {
    flex: 1,
    minWidth: "47%",
    padding: spacing.sm,
    marginBottom: 0
  },
  kpiHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4
  },
  kpiLabel: {
    fontSize: 10.5,
    fontWeight: "600",
    color: colors.inkMuted,
    textTransform: "uppercase"
  },
  kpiIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center"
  },
  kpiValue: {
    fontWeight: "700",
    fontSize: 18,
    color: colors.ink
  },
  kpiSub: {
    fontSize: 10.5,
    marginTop: 2
  },
  sectionCard: {
    padding: spacing.md,
    marginBottom: spacing.xs
  },
  budgetHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm
  },
  adherenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full
  },
  adherenceBadgeHigh: {
    backgroundColor: "rgba(16, 185, 129, 0.1)"
  },
  adherenceBadgeMid: {
    backgroundColor: "rgba(245, 158, 11, 0.1)"
  },
  adherenceBadgeLow: {
    backgroundColor: "rgba(239, 68, 68, 0.1)"
  },
  adherenceText: {
    fontSize: 11,
    fontWeight: "700"
  },
  adherenceTextHigh: {
    color: colors.success
  },
  adherenceTextMid: {
    color: "#F59E0B"
  },
  adherenceTextLow: {
    color: colors.error
  },
  budgetsList: {
    gap: spacing.sm,
    marginTop: spacing.xs
  },
  budgetItem: {
    gap: 4,
    paddingVertical: 4
  },
  budgetRowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
    gap: 3
  },
  statusPillText: {
    fontSize: 10.5,
    fontWeight: "700"
  },
  budgetAmountsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2
  }
});
