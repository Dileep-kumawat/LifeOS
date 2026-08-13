import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { DollarSign, ArrowRight, TrendingUp, TrendingDown, Wallet, Plus } from "lucide-react";
import { financeApi } from "../../finance/api";
import { Skeleton } from "../../../components/ui/Skeleton";
import type { Transaction } from "../../finance/types";

export function FinanceSnapshotWidget() {
  const { data: summaryData, isLoading: isSummaryLoading } = useQuery({
    queryKey: ["finance", "summary"],
    queryFn: () => financeApi.getSummary()
  });

  const { data: transactionsData, isLoading: isTxLoading } = useQuery({
    queryKey: ["finance", "transactions", { limit: 4 }],
    queryFn: () => financeApi.listTransactions({ limit: 4 })
  });

  const income = summaryData?.monthlyTotals?.income ?? 0;
  const expense = summaryData?.monthlyTotals?.expense ?? 0;
  const transactions: Transaction[] = transactionsData?.data || [];

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Wallet className="size-4" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">Finance & Budget</h3>
            <p className="text-[11px] text-muted-foreground">Monthly cash flow</p>
          </div>
        </div>

        <Link
          to="/finance"
          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors"
        >
          View Finance <ArrowRight className="size-3" />
        </Link>
      </div>

      {isSummaryLoading ? (
        <Skeleton className="h-16 w-full rounded-xl mb-4" />
      ) : (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex flex-col gap-1 rounded-xl border border-emerald-200/60 bg-emerald-50/50 p-3 dark:border-emerald-900/30 dark:bg-emerald-950/20">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              <TrendingUp className="size-3" />
              Income
            </div>
            <div className="text-base font-bold text-emerald-700 dark:text-emerald-300">
              ${income.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="flex flex-col gap-1 rounded-xl border border-rose-200/60 bg-rose-50/50 p-3 dark:border-rose-900/30 dark:bg-rose-950/20">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400">
              <TrendingDown className="size-3" />
              Expenses
            </div>
            <div className="text-base font-bold text-rose-700 dark:text-rose-300">
              ${expense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
        <span>Recent Transactions</span>
      </div>

      {isTxLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-5 text-center">
          <p className="text-xs text-muted-foreground mb-2">No transactions recorded yet.</p>
          <Link
            to="/finance"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-accent/40 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
          >
            <Plus className="size-3.5" />
            Add Transaction
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {transactions.slice(0, 4).map((tx: Transaction) => {
            const isIncome = tx.type === "income";
            return (
              <li
                key={tx.id || (tx as any)._id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-accent/20 p-2.5 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${
                      isIncome
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    <DollarSign className="size-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {tx.note || tx.category || "Transaction"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {tx.category} • {new Date(tx.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </p>
                  </div>
                </div>

                <span
                  className={`font-mono font-semibold shrink-0 ${
                    isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {isIncome ? "+" : "-"}${Math.abs(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
