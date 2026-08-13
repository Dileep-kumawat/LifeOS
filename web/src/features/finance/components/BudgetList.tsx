import React, { useState } from "react";
import type { Budget } from "../types";
import { BudgetProgressBar } from "./BudgetProgressBar";

export interface BudgetListProps {
  budgets: Budget[];
  isLoading?: boolean;
  onSelectBudget: (budget: Budget) => void;
  onCreateBudget: () => void;
  onEditBudget: (budget: Budget) => void;
  onDeleteBudget: (id: string) => void;
}

export const BudgetList: React.FC<BudgetListProps> = ({
  budgets,
  isLoading = false,
  onSelectBudget,
  onCreateBudget,
  onEditBudget,
  onDeleteBudget
}) => {
  const [search, setSearch] = useState("");

  const filtered = budgets.filter((b) =>
    b.category.toLowerCase().includes(search.toLowerCase())
  );

  // Surface over-budget items first
  const sorted = [...filtered].sort((a, b) => {
    if (a.isOverBudget !== b.isOverBudget) {
      return a.isOverBudget ? -1 : 1;
    }
    return b.percentUsed - a.percentUsed;
  });

  const overBudgetCount = budgets.filter((b) => b.isOverBudget).length;

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-neutral-900">Category Budgets</h2>
            {overBudgetCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-semibold text-red-700 bg-red-100 rounded-full">
                {overBudgetCount} Over Budget
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500">
            Track monthly spend limits by category with real-time threshold monitoring.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search budgets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-1.5 text-sm bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#0075de]"
          />
          <button
            onClick={onCreateBudget}
            className="px-4 py-2 text-sm font-medium text-white bg-[#0075de] hover:bg-[#005bab] rounded-full transition-colors shadow-sm flex items-center gap-1.5 whitespace-nowrap"
          >
            <span>+</span> Set Budget
          </button>
        </div>
      </div>

      {/* Loading Skeleton / Empty State / Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-5 bg-white rounded-xl border border-neutral-200 animate-pulse h-36 flex flex-col justify-between"
            >
              <div className="h-4 bg-neutral-200 rounded w-1/3" />
              <div className="h-3 bg-neutral-200 rounded w-full" />
              <div className="h-3 bg-neutral-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-neutral-300 flex flex-col items-center gap-3">
          <div className="text-3xl">📊</div>
          <h3 className="text-base font-semibold text-neutral-800">
            {search ? "No matching budgets" : "No active budgets"}
          </h3>
          <p className="text-xs text-neutral-500 max-w-sm">
            {search
              ? "Try adjusting your search query."
              : "Create your first category budget to track monthly limits and get overspend alerts."}
          </p>
          {!search && (
            <button
              onClick={onCreateBudget}
              className="mt-2 px-4 py-2 text-xs font-semibold text-white bg-[#0075de] hover:bg-[#005bab] rounded-full shadow-xs"
            >
              Create Budget
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sorted.map((budget) => (
            <div
              key={budget.id}
              onClick={() => onSelectBudget(budget)}
              className={`p-5 bg-white rounded-xl border transition-all cursor-pointer hover:shadow-md flex flex-col justify-between gap-4 ${
                budget.isOverBudget
                  ? "border-red-300 bg-red-50/20"
                  : "border-neutral-200 hover:border-neutral-300"
              }`}
            >
              <BudgetProgressBar
                currentSpend={budget.currentSpend}
                limit={budget.limit}
                category={budget.category}
                period={budget.period}
              />

              <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-xs">
                <span className="text-neutral-400">
                  Updated {new Date(budget.updatedAt).toLocaleDateString()}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditBudget(budget);
                    }}
                    className="text-[#0075de] hover:underline font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteBudget(budget.id);
                    }}
                    className="text-neutral-400 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
