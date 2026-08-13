import React, { useState } from "react";
import type { Category } from "../types";

export interface BudgetFormProps {
  categories: Category[];
  initialValues?: {
    id?: string;
    category?: string;
    limit?: number;
    period?: "monthly";
  };
  onSubmit: (values: { category: string; limit: number; period: "monthly" }) => Promise<void>;
  onCancel: () => void;
  errorMessage?: string | null;
  isSubmitting?: boolean;
}

export const BudgetForm: React.FC<BudgetFormProps> = ({
  categories,
  initialValues,
  onSubmit,
  onCancel,
  errorMessage: externalErrorMessage,
  isSubmitting = false
}) => {
  const isEdit = Boolean(initialValues?.id);
  const expenseCategories = categories.filter((c) => c.type === "expense");

  const [category, setCategory] = useState<string>(
    initialValues?.category || (expenseCategories[0]?.name ?? "")
  );
  const [limit, setLimit] = useState<string>(
    initialValues?.limit ? String(initialValues.limit) : ""
  );
  const [period] = useState<"monthly">("monthly");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!category.trim()) {
      setValidationError("Please select an expense category");
      return;
    }

    const numericLimit = parseFloat(limit);
    if (isNaN(numericLimit) || numericLimit <= 0) {
      setValidationError("Limit must be a positive number greater than 0");
      return;
    }

    try {
      await onSubmit({ category: category.trim(), limit: numericLimit, period });
    } catch (err: any) {
      // Errors handled at caller or passed via props
    }
  };

  const activeError = validationError || externalErrorMessage;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-md bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
      <div className="flex flex-col gap-1 border-b border-neutral-100 pb-3">
        <h3 className="text-lg font-semibold text-neutral-900">
          {isEdit ? `Edit Budget: ${initialValues?.category}` : "Create New Category Budget"}
        </h3>
        <p className="text-xs text-neutral-500">
          Set spending limits per category to track overspend automatically.
        </p>
      </div>

      {activeError && (
        <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <span className="font-bold">⚠️</span>
          <span>{activeError}</span>
        </div>
      )}

      {/* Category Picker */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="budget-category" className="text-xs font-semibold text-neutral-700">
          Expense Category
        </label>
        {isEdit ? (
          <input
            id="budget-category"
            type="text"
            value={category}
            disabled
            className="w-full px-3 py-2 bg-neutral-100 border border-neutral-200 rounded-md text-neutral-600 text-sm cursor-not-allowed"
          />
        ) : (
          <select
            id="budget-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={isSubmitting}
            className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-md text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#0075de]"
          >
            {expenseCategories.length === 0 ? (
              <option value="">No expense categories found</option>
            ) : (
              expenseCategories.map((c) => (
                <option key={c.id || c.name} value={c.name}>
                  {c.name}
                </option>
              ))
            )}
          </select>
        )}
      </div>

      {/* Limit Input */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="budget-limit" className="text-xs font-semibold text-neutral-700">
          Monthly Limit ($)
        </label>
        <input
          id="budget-limit"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="e.g. 500.00"
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
          disabled={isSubmitting}
          className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-md text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#0075de]"
          required
        />
      </div>

      {/* Period Selector (Simple Monthly default) */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="budget-period" className="text-xs font-semibold text-neutral-700">
          Budget Period
        </label>
        <select
          id="budget-period"
          value={period}
          disabled
          className="w-full px-3 py-2 bg-neutral-100 border border-neutral-200 rounded-md text-xs text-neutral-600 cursor-not-allowed"
        >
          <option value="monthly">Monthly (Default)</option>
        </select>
      </div>

      {/* Form Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-full transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || (!isEdit && expenseCategories.length === 0)}
          className="px-5 py-2 text-sm font-medium text-white bg-[#0075de] hover:bg-[#005bab] disabled:opacity-50 rounded-full transition-colors shadow-sm"
        >
          {isSubmitting ? "Saving..." : isEdit ? "Update Budget" : "Create Budget"}
        </button>
      </div>
    </form>
  );
};
