import React from "react";
import type { BudgetDetail } from "../types";
import { BudgetProgressBar } from "./BudgetProgressBar";

export interface BudgetDetailDialogProps {
  budget: BudgetDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (budget: BudgetDetail) => void;
  onDelete: (id: string) => void;
}

export const BudgetDetailDialog: React.FC<BudgetDetailDialogProps> = ({
  budget,
  isOpen,
  onClose,
  onEdit,
  onDelete
}) => {
  if (!isOpen || !budget) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xl max-w-lg w-full p-6 flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-neutral-100 pb-4">
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold text-neutral-400">
              Budget Detail
            </span>
            <h2 className="text-xl font-bold text-neutral-900">{budget.category}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 text-xl font-bold p-1 rounded-md"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Progress Bar Display */}
        <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-100">
          <BudgetProgressBar
            currentSpend={budget.currentSpend}
            limit={budget.limit}
            category={budget.category}
            period={budget.period}
          />
        </div>

        {/* Contributing Transactions Section */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-neutral-800">
              Recent Transactions ({budget.recentTransactions?.length || 0})
            </h4>
            <span className="text-xs text-neutral-500">Current Month</span>
          </div>

          {!budget.recentTransactions || budget.recentTransactions.length === 0 ? (
            <div className="p-6 text-center text-sm text-neutral-500 bg-neutral-50 rounded-lg border border-dashed border-neutral-200">
              No transactions recorded for this category in the current month.
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto flex flex-col divide-y divide-neutral-100 border border-neutral-200 rounded-lg">
              {budget.recentTransactions.map((tx) => (
                <div key={tx.id} className="p-3 flex items-center justify-between hover:bg-neutral-50">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-neutral-900">
                      {tx.note || tx.category}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {new Date(tx.date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric"
                      })}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-red-600">
                    -${tx.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
          <button
            onClick={() => onDelete(budget.id)}
            className="px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-full transition-colors"
          >
            Delete Budget
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-full"
            >
              Close
            </button>
            <button
              onClick={() => onEdit(budget)}
              className="px-4 py-2 text-xs font-medium text-white bg-[#0075de] hover:bg-[#005bab] rounded-full"
            >
              Edit Limit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
