import { TrendingUp, PieChart, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import type { FinanceSummaryResponse } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/Card";

interface FinanceSummaryWidgetProps {
  summary: FinanceSummaryResponse | null;
  isLoading?: boolean;
}

export function FinanceSummaryWidget({ summary, isLoading }: FinanceSummaryWidgetProps) {
  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        <div className="h-64 rounded-xl bg-muted/60 animate-pulse border border-border" />
        <div className="h-64 rounded-xl bg-muted/60 animate-pulse border border-border" />
      </div>
    );
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);

  const { monthlyTotals, categoryBreakdown, trend } = summary;
  const totalCategoryExpense = categoryBreakdown
    .filter((c) => c.type === "expense")
    .reduce((acc, curr) => acc + curr.totalAmount, 0);

  const expenseCategories = categoryBreakdown.filter((c) => c.type === "expense");

  // Max amount for scaling trend bars
  const maxTrendAmount = Math.max(
    ...trend.map((t) => Math.max(t.income, t.expense)),
    100
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
      {/* Monthly Overview & Category Breakdown */}
      <Card className="flex flex-col justify-between">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChart className="size-4 text-primary" />
              <span>Monthly Breakdown ({summary.month})</span>
            </div>
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                monthlyTotals.net >= 0
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-600 border-rose-500/20"
              }`}
            >
              Net: {monthlyTotals.net >= 0 ? "+" : ""}
              {formatCurrency(monthlyTotals.net)}
            </span>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-border bg-accent/20">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <ArrowUpRight className="size-3 text-emerald-500" /> Income
              </span>
              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                +{formatCurrency(monthlyTotals.income)}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <ArrowDownLeft className="size-3 text-rose-500" /> Expense
              </span>
              <span className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                -{formatCurrency(monthlyTotals.expense)}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 max-h-[160px] overflow-y-auto pr-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Top Expenses by Category
            </span>
            {expenseCategories.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-2">No expenses logged for this month.</p>
            ) : (
              expenseCategories.slice(0, 5).map((item) => {
                const percentage =
                  totalCategoryExpense > 0
                    ? Math.round((item.totalAmount / totalCategoryExpense) * 100)
                    : 0;

                return (
                  <div key={item.category} className="flex flex-col gap-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">{item.category}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground font-medium">{percentage}%</span>
                        <span className="font-semibold text-foreground">
                          {formatCurrency(item.totalAmount)}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Multi-Month Trend Chart */}
      <Card className="flex flex-col justify-between">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="size-4 text-emerald-500" />
            <span>Financial Trend (Last {trend.length} Months)</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-end gap-4 text-xs font-medium text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="size-2.5 rounded-full bg-emerald-500" />
              <span>Income</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-2.5 rounded-full bg-rose-500" />
              <span>Expense</span>
            </div>
          </div>

          <div className="flex items-end justify-between gap-2 h-40 pt-4 pb-2 border-b border-border">
            {trend.map((item) => {
              const incomeHeight = Math.round((item.income / maxTrendAmount) * 100);
              const expenseHeight = Math.round((item.expense / maxTrendAmount) * 100);

              const monthLabel = (() => {
                const parts = item.month.split("-");
                const mIdx = parseInt(parts[1], 10) - 1;
                const monthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                return monthsShort[mIdx] || item.month;
              })();

              return (
                <div key={item.month} className="flex flex-col items-center flex-1 h-full justify-end group">
                  <div className="flex items-end gap-1 w-full justify-center h-full">
                    {/* Income Bar */}
                    <div
                      className="w-3 rounded-t-sm bg-emerald-500/80 group-hover:bg-emerald-500 transition-all relative"
                      style={{ height: `${Math.max(incomeHeight, 4)}%` }}
                      title={`Income (${item.month}): ${formatCurrency(item.income)}`}
                    />
                    {/* Expense Bar */}
                    <div
                      className="w-3 rounded-t-sm bg-rose-500/80 group-hover:bg-rose-500 transition-all relative"
                      style={{ height: `${Math.max(expenseHeight, 4)}%` }}
                      title={`Expense (${item.month}): ${formatCurrency(item.expense)}`}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-muted-foreground mt-2 truncate">
                    {monthLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
