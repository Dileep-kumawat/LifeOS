import { useState, useCallback } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  StatusBar
} from "react-native";
import {
  Activity,
  Wallet,
  Download,
  AlertCircle,
  Sparkles
} from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { ScreenContainer } from "../../components/ui/ScreenContainer";
import { ThemedText } from "../../components/ui/ThemedText";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { DateRangePicker, computeMobilePresetRange, type MobileDateRangeValue } from "../../components/analytics/DateRangePicker";
import { ExportActionModal } from "../../components/analytics/ExportActionModal";
import { ProductivityAnalyticsView } from "../../components/analytics/ProductivityAnalyticsView";
import { FinanceAnalyticsView } from "../../components/analytics/FinanceAnalyticsView";
import { analyticsApiService } from "../../services/analyticsApiService";
import { colors, spacing, radius } from "../../theme";

export function AnalyticsScreen() {
  const [activeTab, setActiveTab] = useState<"productivity" | "finance">("productivity");
  const [dateRange, setDateRange] = useState<MobileDateRangeValue>({
    ...computeMobilePresetRange("this_month"),
    preset: "this_month"
  });
  const [isExportModalVisible, setIsExportModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Query 1: Productivity Analytics
  const {
    data: productivityData,
    isLoading: isProductivityLoading,
    isError: isProductivityError,
    error: productivityError,
    refetch: refetchProductivity
  } = useQuery({
    queryKey: ["mobile-analytics", "productivity", dateRange.startDate, dateRange.endDate],
    queryFn: () => analyticsApiService.getProductivityAnalytics(dateRange.startDate, dateRange.endDate),
    staleTime: 60 * 1000
  });

  // Query 2: Finance Analytics
  const {
    data: financeData,
    isLoading: isFinanceLoading,
    isError: isFinanceError,
    error: financeError,
    refetch: refetchFinance
  } = useQuery({
    queryKey: ["mobile-analytics", "finance", dateRange.startDate, dateRange.endDate],
    queryFn: () => analyticsApiService.getFinanceAnalytics(dateRange.startDate, dateRange.endDate),
    staleTime: 60 * 1000
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchProductivity(), refetchFinance()]);
    setRefreshing(false);
  }, [refetchProductivity, refetchFinance]);

  const isCurrentError = activeTab === "productivity" ? isProductivityError : isFinanceError;
  const currentError = activeTab === "productivity" ? productivityError : financeError;

  return (
    <ScreenContainer
      scrollable
      includeDockPadding
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      <StatusBar barStyle="dark-content" />

      {/* 1. Header & Controls Bar */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.badgePill}>
            <Sparkles size={12} color={colors.primary} />
            <ThemedText variant="caption" style={styles.badgePillText}>
              Executive Intelligence
            </ThemedText>
          </View>
          <ThemedText variant="heading2" style={styles.screenTitle}>
            Analytics
          </ThemedText>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setIsExportModalVisible(true)}
          style={styles.exportBtn}
        >
          <Download size={15} color={colors.primary} />
          <ThemedText variant="caption" style={styles.exportBtnText}>
            Export
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* 2. Date Range Picker */}
      <DateRangePicker value={dateRange} onChange={setDateRange} />

      {/* 3. Segmented Tab Switcher (Productivity | Finance) */}
      <View style={styles.tabSwitcherRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setActiveTab("productivity")}
          style={[
            styles.tabSegment,
            activeTab === "productivity" && styles.tabSegmentActive
          ]}
        >
          <Activity
            size={16}
            color={activeTab === "productivity" ? colors.primary : colors.inkMuted}
          />
          <ThemedText
            variant="bodySm"
            style={[
              styles.tabSegmentText,
              activeTab === "productivity" && styles.tabSegmentTextActive
            ]}
          >
            Productivity
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setActiveTab("finance")}
          style={[
            styles.tabSegment,
            activeTab === "finance" && styles.tabSegmentActive
          ]}
        >
          <Wallet
            size={16}
            color={activeTab === "finance" ? colors.primary : colors.inkMuted}
          />
          <ThemedText
            variant="bodySm"
            style={[
              styles.tabSegmentText,
              activeTab === "finance" && styles.tabSegmentTextActive
            ]}
          >
            Finance
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* 4. Error Retry Banner */}
      {isCurrentError && (
        <Card style={styles.errorCard}>
          <View style={styles.errorRow}>
            <AlertCircle size={18} color={colors.error} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <ThemedText variant="bodySm" style={{ fontWeight: "700", color: colors.error }}>
                Failed to load {activeTab} analytics
              </ThemedText>
              <ThemedText variant="caption" color={colors.inkMuted}>
                {(currentError as any)?.message || "Network error. Please try again."}
              </ThemedText>
            </View>
          </View>
          <Button
            title="Retry"
            size="sm"
            variant="secondary"
            onPress={onRefresh}
            style={{ marginTop: spacing.sm }}
          />
        </Card>
      )}

      {/* 5. Tab Content Views */}
      {activeTab === "productivity" ? (
        <ProductivityAnalyticsView
          data={productivityData}
          isLoading={isProductivityLoading && !refreshing}
        />
      ) : (
        <FinanceAnalyticsView
          data={financeData}
          isLoading={isFinanceLoading && !refreshing}
        />
      )}

      {/* 6. Export Modal */}
      <ExportActionModal
        visible={isExportModalVisible}
        onClose={() => setIsExportModalVisible(false)}
        defaultType={activeTab}
        startDate={dateRange.startDate}
        endDate={dateRange.endDate}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    paddingTop: spacing.xs
  },
  headerLeft: {
    gap: 2
  },
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 117, 222, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    gap: 4,
    alignSelf: "flex-start"
  },
  badgePillText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: colors.primary
  },
  screenTitle: {
    fontWeight: "700",
    color: colors.ink
  },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1
  },
  exportBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary
  },
  tabSwitcherRow: {
    flexDirection: "row",
    backgroundColor: colors.canvasSoft,
    padding: 3,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    marginBottom: spacing.sm,
    gap: 4
  },
  tabSegment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: radius.sm,
    gap: 6
  },
  tabSegmentActive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  tabSegmentText: {
    fontWeight: "600",
    color: colors.inkMuted,
    fontSize: 12.5
  },
  tabSegmentTextActive: {
    color: colors.primary,
    fontWeight: "700"
  },
  errorCard: {
    padding: spacing.md,
    backgroundColor: "rgba(220, 38, 38, 0.05)",
    borderColor: "rgba(220, 38, 38, 0.2)",
    marginBottom: spacing.sm
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center"
  }
});
