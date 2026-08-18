import { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Plus, DollarSign, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react-native";
import { ScreenContainer } from "../../components/ui/ScreenContainer";
import { ThemedText } from "../../components/ui/ThemedText";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { SyncBadge } from "../../components/ui/SyncBadge";
import { colors, radius, spacing } from "../../theme";
import { useAuthStore } from "../../store/authStore";
import { financeRepo, type FinanceSummaryData } from "../../db/repositories/financeRepo";
import { syncEngine } from "../../services/syncEngine";
import type { LocalTransaction, LocalBudget } from "../../db/schema";

import { TransactionFormModal } from "../../components/finance/TransactionFormModal";
import { BudgetFormModal } from "../../components/finance/BudgetFormModal";
import { CategoryBreakdownChart, TrendLineChart } from "../../components/finance/FinanceCharts";
import { FinanceInsightsCard } from "../../components/finance/FinanceInsightsCard";

type FinanceTab = "transactions" | "budgets" | "analytics";

export function FinanceScreen() {
  const user = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<FinanceTab>("transactions");

  const [transactions, setTransactions] = useState<LocalTransaction[]>([]);
  const [budgets, setBudgets] = useState<LocalBudget[]>([]);
  const [summary, setSummary] = useState<FinanceSummaryData>({
    totalIncome: 0,
    totalExpense: 0,
    netSavings: 0,
    savingsRate: 0,
    categoryBreakdown: [],
    monthlyTrends: []
  });

  const [editingTransaction, setEditingTransaction] = useState<LocalTransaction | null>(null);
  const [isTxModalVisible, setIsTxModalVisible] = useState(false);

  const [editingBudget, setEditingBudget] = useState<LocalBudget | null>(null);
  const [isBudgetModalVisible, setIsBudgetModalVisible] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.id) return;

    const [txList, budgetList, summaryData] = await Promise.all([
      financeRepo.listTransactions(user.id),
      financeRepo.listBudgets(user.id),
      financeRepo.getFinanceSummary(user.id)
    ]);

    setTransactions(txList);
    setBudgets(budgetList);
    setSummary(summaryData);
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveTransaction = async (txData: {
    amount: number;
    type: "income" | "expense";
    category: string;
    date: string;
    note: string;
    receiptAttachment: string | null;
  }) => {
    if (!user?.id) return;

    if (editingTransaction) {
      await financeRepo.updateTransaction(editingTransaction.id, txData);
    } else {
      await financeRepo.createTransaction({
        userId: user.id,
        ...txData
      });
    }

    await loadData();
    syncEngine.syncNow().catch(() => {});
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!user?.id) return;
    await financeRepo.deleteTransaction(id);
    await loadData();
    syncEngine.syncNow().catch(() => {});
  };

  const handleSaveBudget = async (budgetData: {
    category: string;
    limit: number;
    period: "monthly";
  }) => {
    if (!user?.id) return;

    await financeRepo.createOrUpdateBudget({
      userId: user.id,
      ...budgetData,
      currentSpend: 0,
      notifiedOverspend: 0
    });

    await loadData();
    syncEngine.syncNow().catch(() => {});
  };

  const handleDeleteBudget = async (id: string) => {
    if (!user?.id) return;
    await financeRepo.deleteBudget(id);
    await loadData();
    syncEngine.syncNow().catch(() => {});
  };

  return (
    <ScreenContainer scrollable={false}>
      {/* Top Header */}
      <View style={styles.headerBar}>
        <ThemedText variant="heading2">Finance</ThemedText>
        <Button
          title={activeTab === "budgets" ? "New Budget" : "Log Expense"}
          icon={<Plus size={16} color={colors.onPrimary} />}
          onPress={() => {
            if (activeTab === "budgets") {
              setEditingBudget(null);
              setIsBudgetModalVisible(true);
            } else {
              setEditingTransaction(null);
              setIsTxModalVisible(true);
            }
          }}
          style={styles.addBtn}
        />
      </View>

      {/* Monthly Summary Cards */}
      <View style={styles.summaryGrid}>
        <Card style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <ThemedText variant="caption" color={colors.inkMuted}>
              Income
            </ThemedText>
            <TrendingUp size={14} color={colors.success} />
          </View>
          <ThemedText variant="heading3" color={colors.success}>
            +${Math.round(summary.totalIncome)}
          </ThemedText>
        </Card>

        <Card style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <ThemedText variant="caption" color={colors.inkMuted}>
              Expense
            </ThemedText>
            <TrendingDown size={14} color={colors.error} />
          </View>
          <ThemedText variant="heading3" color={colors.error}>
            -${Math.round(summary.totalExpense)}
          </ThemedText>
        </Card>

        <Card style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <ThemedText variant="caption" color={colors.inkMuted}>
              Net Savings
            </ThemedText>
            <DollarSign size={14} color={colors.primary} />
          </View>
          <ThemedText
            variant="heading3"
            color={summary.netSavings >= 0 ? colors.ink : colors.error}
          >
            ${Math.round(summary.netSavings)}
          </ThemedText>
        </Card>
      </View>

      {/* Segmented Tab Navigation */}
      <View style={styles.tabSegment}>
        {(["transactions", "budgets", "analytics"] as const).map((tab) => {
          const isSelected = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.segmentBtn, isSelected && styles.segmentBtnActive]}
            >
              <ThemedText
                variant="caption"
                color={isSelected ? colors.onPrimary : colors.ink}
                style={{ fontWeight: "600", textTransform: "capitalize" }}
              >
                {tab}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tab Content */}
      <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
        {activeTab === "transactions" && (
          <View style={styles.listContainer}>
            {transactions.length === 0 ? (
              <Card style={styles.emptyCard}>
                <ThemedText variant="bodyMd" color={colors.inkMuted} style={{ textAlign: "center" }}>
                  No transactions logged. Tap "+ Log Expense" to record spending offline.
                </ThemedText>
              </Card>
            ) : (
              transactions.map((tx) => {
                const isExpense = tx.type === "expense";
                const dateFormatted = new Date(tx.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric"
                });

                return (
                  <TouchableOpacity
                    key={tx.id}
                    activeOpacity={0.7}
                    onPress={() => {
                      setEditingTransaction(tx);
                      setIsTxModalVisible(true);
                    }}
                  >
                    <Card style={styles.txCard}>
                      <View style={styles.txLeft}>
                        <View
                          style={[
                            styles.txIconWrap,
                            { backgroundColor: isExpense ? "#FEE2E2" : "#D1FAE5" }
                          ]}
                        >
                          {isExpense ? (
                            <TrendingDown size={16} color={colors.error} />
                          ) : (
                            <TrendingUp size={16} color={colors.success} />
                          )}
                        </View>
                        <View style={styles.txInfo}>
                          <ThemedText variant="heading3" numberOfLines={1}>
                            {tx.category}
                          </ThemedText>
                          <ThemedText variant="caption" color={colors.inkMuted} numberOfLines={1}>
                            {tx.note ? `${tx.note} • ${dateFormatted}` : dateFormatted}
                          </ThemedText>
                        </View>
                      </View>

                      <View style={styles.txRight}>
                        <ThemedText
                          variant="heading3"
                          color={isExpense ? colors.ink : colors.success}
                          style={{ fontWeight: "700" }}
                        >
                          {isExpense ? "-" : "+"}${Number(tx.amount).toFixed(2)}
                        </ThemedText>
                        <SyncBadge status={tx.syncStatus} />
                      </View>
                    </Card>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {activeTab === "budgets" && (
          <View style={styles.listContainer}>
            {budgets.length === 0 ? (
              <Card style={styles.emptyCard}>
                <ThemedText variant="bodyMd" color={colors.inkMuted} style={{ textAlign: "center" }}>
                  No category budgets created. Tap "+ New Budget" to set spending limits.
                </ThemedText>
              </Card>
            ) : (
              budgets.map((b) => {
                const percent = Math.round((b.currentSpend / b.limit) * 100);
                const isOverspent = b.currentSpend > b.limit;
                const isNearLimit = percent >= 80 && !isOverspent;

                return (
                  <TouchableOpacity
                    key={b.id}
                    activeOpacity={0.7}
                    onPress={() => {
                      setEditingBudget(b);
                      setIsBudgetModalVisible(true);
                    }}
                  >
                    <Card style={styles.budgetCard}>
                      <View style={styles.budgetHeader}>
                        <View style={styles.budgetTitleArea}>
                          <ThemedText variant="heading3">{b.category}</ThemedText>
                          {isOverspent ? (
                            <View style={styles.overspendBadge}>
                              <AlertTriangle size={11} color={colors.error} />
                              <ThemedText variant="caption" color={colors.error} style={{ fontWeight: "600" }}>
                                Overspent (${Math.round(b.currentSpend - b.limit)})
                              </ThemedText>
                            </View>
                          ) : isNearLimit ? (
                            <View style={styles.warningBadge}>
                              <ThemedText variant="caption" color={colors.warning} style={{ fontWeight: "600" }}>
                                80%+ Limit Reached
                              </ThemedText>
                            </View>
                          ) : null}
                        </View>
                        <SyncBadge status={b.syncStatus} />
                      </View>

                      <View style={styles.budgetNumbers}>
                        <ThemedText variant="caption" color={colors.inkMuted}>
                          Spent ${Math.round(b.currentSpend)} of ${Math.round(b.limit)}
                        </ThemedText>
                        <ThemedText
                          variant="caption"
                          style={{
                            fontWeight: "700",
                            color: isOverspent ? colors.error : isNearLimit ? colors.warning : colors.ink
                          }}
                        >
                          {percent}%
                        </ThemedText>
                      </View>

                      <ProgressBar
                        progress={percent}
                        height={8}
                        enableThresholdColors
                        style={{ marginTop: 6 }}
                      />
                    </Card>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {activeTab === "analytics" && (
          <View style={styles.analyticsContainer}>
            <FinanceInsightsCard />
            <CategoryBreakdownChart
              data={summary.categoryBreakdown}
              totalExpense={summary.totalExpense}
            />
            <TrendLineChart data={summary.monthlyTrends} />
          </View>
        )}
      </ScrollView>

      {/* Transaction Entry / Edit Modal */}
      <TransactionFormModal
        visible={isTxModalVisible}
        onClose={() => setIsTxModalVisible(false)}
        transactionToEdit={editingTransaction}
        onSave={handleSaveTransaction}
        onDelete={handleDeleteTransaction}
      />

      {/* Budget Form Modal */}
      <BudgetFormModal
        visible={isBudgetModalVisible}
        onClose={() => setIsBudgetModalVisible(false)}
        budgetToEdit={editingBudget}
        onSave={handleSaveBudget}
        onDelete={handleDeleteBudget}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    marginTop: spacing.xs
  },
  addBtn: {
    height: 38,
    paddingHorizontal: spacing.md
  },
  summaryGrid: {
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: spacing.sm
  },
  summaryCard: {
    flex: 1,
    padding: spacing.xs + 2,
    justifyContent: "center",
    gap: 2
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2
  },
  tabSegment: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    padding: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.hairline,
    marginBottom: spacing.sm
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    borderRadius: radius.full
  },
  segmentBtnActive: {
    backgroundColor: colors.primary
  },
  contentScroll: {
    flex: 1
  },
  listContainer: {
    gap: spacing.xs,
    paddingBottom: spacing.lg
  },
  emptyCard: {
    padding: spacing.xl,
    marginTop: spacing.md
  },
  txCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md
  },
  txLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1
  },
  txIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center"
  },
  txInfo: {
    flex: 1
  },
  txRight: {
    alignItems: "flex-end",
    gap: 2
  },
  budgetCard: {
    padding: spacing.md
  },
  budgetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4
  },
  budgetTitleArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  overspendBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs
  },
  warningBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs
  },
  budgetNumbers: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4
  },
  analyticsContainer: {
    gap: spacing.xs,
    paddingBottom: spacing.lg
  }
});

