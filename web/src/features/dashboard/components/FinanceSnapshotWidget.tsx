import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { DollarSign, Wallet, Plus } from "lucide-react";
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

  const netBalance = (income - expense);
  const totalFlow = income + expense;
  const incomePercent = totalFlow > 0 ? Math.round((income / totalFlow) * 100) : 0;
  const expensePercent = totalFlow > 0 ? Math.round((expense / totalFlow) * 100) : 0;

  const currentMonthName = new Date().toLocaleDateString(undefined, { month: "long" });

  return (
    <div className="bg-white rounded-xl border border-[#e6e6e6] p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-[20px] font-bold text-[#1a1c1c] flex items-center gap-2">
          <Wallet className="size-5 text-[#717784]" />
          Finance Pulse
        </h3>
        <Link
          to="/finance"
          className="text-[#005db2] text-sm font-semibold hover:underline transition-colors"
        >
          View Finance
        </Link>
      </div>

      <div className="mb-6">
        <p className="text-xs text-[#717784] mb-1">{currentMonthName} Net Cashflow</p>
        <p className="text-3xl font-bold tracking-tight text-[#1a1c1c]">
          ₹{netBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>

      {isSummaryLoading ? (
        <Skeleton className="h-16 w-full rounded-lg mb-6" />
      ) : (
        <div className="space-y-4 mb-6">
          <div>
            <div className="flex justify-between text-xs font-medium mb-1">
              <span className="text-[#414753] flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500" /> Income
              </span>
              <span className="font-bold text-[#1a1c1c]">
                ₹{income.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="h-2 w-full bg-[#efeeed] rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${incomePercent}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium mb-1">
              <span className="text-[#414753] flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-rose-500" /> Expenses
              </span>
              <span className="font-bold text-[#1a1c1c]">
                ₹{expense.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="h-2 w-full bg-[#efeeed] rounded-full overflow-hidden">
              <div
                className="h-full bg-rose-500 rounded-full transition-all duration-300"
                style={{ width: `${expensePercent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-[11px] font-bold text-[#717784] uppercase tracking-wider mb-3">
        <span>Recent Transactions</span>
      </div>

      {isTxLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <p className="text-xs text-[#717784] mb-2">No transactions recorded yet.</p>
          <Link
            to="/finance"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#e6e6e6] bg-[#faf9f8] px-3.5 py-1.5 text-xs font-semibold text-[#1a1c1c] hover:bg-[#e9e8e7] transition-colors"
          >
            <Plus className="size-3.5" />
            Add Transaction
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {transactions.slice(0, 3).map((tx: Transaction) => {
            const isIncome = tx.type === "income";
            return (
              <li
                key={tx.id || (tx as any)._id}
                className="flex items-center justify-between gap-3 rounded-lg border border-[#e3e2e1] bg-[#faf9f8] p-2.5 text-xs hover:bg-white transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`flex size-6 shrink-0 items-center justify-center rounded ${
                      isIncome
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-rose-500/10 text-rose-600"
                    }`}
                  >
                    <DollarSign className="size-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-[#1a1c1c] truncate">
                      {tx.note || tx.category || "Transaction"}
                    </p>
                    <p className="text-[10px] text-[#717784]">
                      {tx.category} • {new Date(tx.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </p>
                  </div>
                </div>

                <span
                  className={`font-mono font-bold shrink-0 ${
                    isIncome ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {isIncome ? "+" : "-"}₹{Math.abs(tx.amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

