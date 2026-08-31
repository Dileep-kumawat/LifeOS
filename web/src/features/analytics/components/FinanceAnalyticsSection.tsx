import React from "react";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  PieChart as PieIcon
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import type { FinanceAnalytics } from "@lifeos/shared";
import { AnalyticsChart } from "./AnalyticsChart";

interface FinanceAnalyticsSectionProps {
  data?: FinanceAnalytics;
  isLoading?: boolean;
}

const CATEGORY_COLORS = [
  "#0075de", // Primary blue
  "#2a9d99", // Teal
  "#dd5b00", // Orange
  "#ff64c8", // Pink
  "#d6b6f6", // Purple
  "#62aef0", // Sky
  "#1aae39", // Green
  "#523410" // Brown
];

export const FinanceAnalyticsSection: React.FC<FinanceAnalyticsSectionProps> = ({
  data,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse" role="status" aria-label="Loading financial metrics">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white border border-[#e6e6e6] rounded-xl p-5" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 h-80 bg-white border border-[#e6e6e6] rounded-xl p-6" />
          <div className="lg:col-span-6 h-80 bg-white border border-[#e6e6e6] rounded-xl p-6" />
        </div>
      </div>
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
      <div
        className="p-12 bg-white border border-[#e6e6e6] rounded-2xl text-center shadow-xs flex flex-col items-center justify-center"
        data-testid="finance-empty-state"
      >
        <div className="size-14 rounded-2xl bg-[#f6f5f4] border border-[#e6e6e6] flex items-center justify-center text-[#0075de] mb-4">
          <Wallet className="size-7" />
        </div>
        <h3 className="text-lg font-bold text-[#000000] mb-2">No Financial Data Logged</h3>
        <p className="text-sm text-[#615d59] max-w-md leading-relaxed mb-6">
          Record income or expenses in the Finance module, set monthly category budgets, or expand
          the selected date range to view financial analytics.
        </p>
      </div>
    );
  }

  const expenseCategories = data.categoryBreakdown.filter(
    (c) => c.type === "expense" && c.totalAmount > 0
  );

  const pieData = expenseCategories.map((item) => ({
    name: item.category,
    value: item.totalAmount
  }));

  const adherenceRatePercent = Math.round((data.budgetAdherence.adherenceRate || 0) * 100);

  return (
    <div className="flex flex-col gap-6" data-testid="finance-analytics-section">
      {/* 1. KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Income */}
        <div className="p-5 bg-white border border-[#e6e6e6] rounded-xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#615d59] uppercase tracking-wider">
              Total Income
            </span>
            <div className="size-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-600">
              ₹{data.summary.totalIncome.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-[#615d59] mt-1">Inflow over selected range</p>
          </div>
        </div>

        {/* Total Expense */}
        <div className="p-5 bg-white border border-[#e6e6e6] rounded-xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#615d59] uppercase tracking-wider">
              Total Spend
            </span>
            <div className="size-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-rose-600">
              ₹{data.summary.totalExpense.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-[#615d59] mt-1">
              {data.summary.transactionCount} transactions logged
            </p>
          </div>
        </div>

        {/* Net Savings */}
        <div className="p-5 bg-white border border-[#e6e6e6] rounded-xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#615d59] uppercase tracking-wider">
              Net Savings
            </span>
            <div className="size-7 rounded-lg bg-[#0075de]/10 text-[#0075de] flex items-center justify-center">
              <PiggyBank className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <div
              className={`text-2xl font-bold ${
                data.summary.netSavings >= 0 ? "text-[#0075de]" : "text-rose-600"
              }`}
            >
              ₹{data.summary.netSavings.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-[#615d59] mt-1">Income minus expenses</p>
          </div>
        </div>

        {/* Savings Rate */}
        <div className="p-5 bg-white border border-[#e6e6e6] rounded-xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#615d59] uppercase tracking-wider">
              Savings Rate
            </span>
            <div className="size-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Wallet className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#000000]">
              {data.summary.savingsRate.toFixed(1)}%
            </div>
            <p className="text-xs text-[#615d59] mt-1">
              {data.summary.savingsRate >= 20 ? "Above target rate" : "Focus on savings target"}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Charts Row: Category Breakdown (matching Phase 4) & Spend Trend (AnalyticsChart) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category Breakdown (Donut matching Phase 4) */}
        <div className="lg:col-span-5 p-6 bg-white border border-[#e6e6e6] rounded-xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-[#000000]">Expense Breakdown</h3>
              <PieIcon className="size-4 text-[#615d59]" />
            </div>
            <p className="text-xs text-[#615d59] mb-4">Proportion of spend by category</p>

            {pieData.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#615d59]">
                No expense transactions logged in this range.
              </div>
            ) : (
              <div className="w-full h-64" aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => [`₹${Number(value).toFixed(2)}`, "Amount"]}
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderRadius: "8px",
                        borderColor: "#e6e6e6",
                        fontSize: "12px"
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value: any) => (
                        <span className="text-xs text-[#31302e] font-medium">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-[#e6e6e6] flex items-center justify-between text-xs text-[#615d59]">
            <span>Active Categories</span>
            <span className="font-bold text-[#000000]">{expenseCategories.length}</span>
          </div>
        </div>

        {/* Spend & Income Trend (AnalyticsChart Line Variant) */}
        <div className="lg:col-span-7">
          <AnalyticsChart
            type="line"
            title="Spending & Income Trend"
            subtitle="Cashflow trajectory over the selected period"
            xKey="period"
            series={[
              { dataKey: "income", name: "Income", color: "#1aae39" },
              { dataKey: "expense", name: "Expense", color: "#dd5b00" },
              { dataKey: "net", name: "Net", color: "#0075de", strokeDasharray: "4 4" }
            ]}
            data={data.trend}
            xAxisFormatter={(val: string) => {
              if (!val) return "";
              const parts = val.split("-");
              if (parts.length === 3) return `${parts[1]}/${parts[2]}`;
              return val;
            }}
            yAxisFormatter={(val: number) => `₹${val}`}
            tooltipFormatter={(val: any, name: string) => [`₹${Number(val).toFixed(2)}`, name]}
          />
        </div>
      </div>

      {/* 3. Budget Adherence Section */}
      <div className="p-6 bg-white border border-[#e6e6e6] rounded-xl shadow-xs">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h3 className="text-base font-bold text-[#000000]">Budget Adherence</h3>
            <p className="text-xs text-[#615d59] mt-0.5">
              Performance against configured category budgets over the selected range
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#000000]">
              {data.budgetAdherence.budgetsOnTrack} of {data.budgetAdherence.budgetsTracked} on track
            </span>
            <span
              className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${
                adherenceRatePercent >= 80
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : adherenceRatePercent >= 50
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "bg-rose-50 text-rose-700 border border-rose-200"
              }`}
            >
              {adherenceRatePercent}% Adherence
            </span>
          </div>
        </div>

        {data.budgetAdherence.budgets.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#615d59]">
            No monthly budgets configured. Set category budgets in Finance to view adherence.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.budgetAdherence.budgets.map((b) => {
              const statusConfig = {
                on_track: {
                  label: "On Track",
                  icon: <CheckCircle2 className="size-3.5 text-emerald-600" />,
                  bg: "bg-emerald-50",
                  text: "text-emerald-700",
                  bar: "bg-emerald-600"
                },
                warning: {
                  label: "Warning (>85%)",
                  icon: <AlertTriangle className="size-3.5 text-amber-600" />,
                  bg: "bg-amber-50",
                  text: "text-amber-700",
                  bar: "bg-amber-500"
                },
                exceeded: {
                  label: "Exceeded",
                  icon: <XCircle className="size-3.5 text-rose-600" />,
                  bg: "bg-rose-50",
                  text: "text-rose-700",
                  bar: "bg-rose-600"
                }
              }[b.status] || {
                label: b.status,
                icon: null,
                bg: "bg-gray-50",
                text: "text-gray-700",
                bar: "bg-gray-500"
              };

              return (
                <div
                  key={b.budgetId}
                  className="p-4 rounded-lg bg-[#faf9f8] border border-[#e6e6e6] flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-xs text-[#000000] truncate">
                      {b.category}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusConfig.bg} ${statusConfig.text}`}
                    >
                      {statusConfig.icon}
                      <span>{statusConfig.label}</span>
                    </span>
                  </div>

                  <div className="mt-2">
                    <div className="flex items-baseline justify-between text-xs mb-1.5">
                      <span className="text-[#615d59]">Spent: ₹{b.actualSpend.toFixed(0)}</span>
                      <span className="font-bold text-[#000000]">
                        Limit: ₹{b.limit.toFixed(0)}
                      </span>
                    </div>

                    <div className="w-full bg-[#e6e6e6] rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${statusConfig.bar}`}
                        style={{ width: `${Math.min(100, b.percentUsed)}%` }}
                      />
                    </div>

                    <div className="mt-1.5 text-right text-[10px] font-semibold text-[#615d59]">
                      {b.percentUsed}% of budget used
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
