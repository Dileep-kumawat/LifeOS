import { Search, Calendar, ChevronLeft, ChevronRight, X, DollarSign } from "lucide-react";
import type { Category, Transaction, TransactionSummaryStats, TransactionType } from "../types";
import { TransactionRow } from "./TransactionRow";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/Button";

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summaryStats?: TransactionSummaryStats;
  isLoading?: boolean;
  // Filter state & handlers
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  selectedType: TransactionType | "";
  onSelectType: (type: TransactionType | "") => void;
  startDate: string;
  onSelectStartDate: (date: string) => void;
  endDate: string;
  onSelectEndDate: (date: string) => void;
  search: string;
  onSearchChange: (search: string) => void;
  onPageChange: (newPage: number) => void;

  onEditTransaction?: (transaction: Transaction) => void;
  onDeleteTransaction?: (transaction: Transaction) => void;
  onClearFilters: () => void;
}

export function TransactionList({
  transactions,
  categories,
  total,
  page,
  totalPages,
  summaryStats,
  isLoading,
  selectedCategory,
  onSelectCategory,
  selectedType,
  onSelectType,
  startDate,
  onSelectStartDate,
  endDate,
  onSelectEndDate,
  search,
  onSearchChange,
  onPageChange,
  onEditTransaction,
  onDeleteTransaction,
  onClearFilters
}: TransactionListProps) {
  const hasActiveFilters = Boolean(selectedCategory || selectedType || startDate || endDate || search);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 p-4 rounded-xl border border-border bg-card shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by note or category..."
              className="pl-9 text-sm"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            {search && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Type Filter Buttons */}
            <div className="inline-flex p-1 rounded-lg border border-border bg-muted/40">
              <button
                type="button"
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  selectedType === ""
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => onSelectType("")}
              >
                All
              </button>
              <button
                type="button"
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  selectedType === "expense"
                    ? "bg-rose-500/20 text-rose-600 dark:text-rose-400 font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => onSelectType("expense")}
              >
                Expense
              </button>
              <button
                type="button"
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  selectedType === "income"
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => onSelectType("income")}
              >
                Income
              </button>
            </div>

            {/* Category Dropdown Filter */}
            <select
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={selectedCategory}
              onChange={(e) => onSelectCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id || cat.name} value={cat.name}>
                  {cat.name} ({cat.type})
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={onClearFilters}
              >
                <X className="size-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Date Range Inputs Row */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/50 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="size-3.5" />
            <span>From:</span>
            <input
              type="date"
              className="px-2 py-1 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              value={startDate}
              onChange={(e) => onSelectStartDate(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span>To:</span>
            <input
              type="date"
              className="px-2 py-1 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              value={endDate}
              onChange={(e) => onSelectEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Running Summary Banner */}
      {summaryStats && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-accent/30 text-sm">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <DollarSign className="size-4 text-primary" />
            <span>
              Showing {total} transaction{total === 1 ? "" : "s"}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="text-emerald-600 dark:text-emerald-400">
              Income: +{formatCurrency(summaryStats.totalIncome)}
            </span>
            <span className="text-rose-600 dark:text-rose-400">
              Expense: -{formatCurrency(summaryStats.totalExpense)}
            </span>
            <span
              className={`px-2.5 py-1 rounded-full border ${
                summaryStats.netBalance >= 0
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-600 border-rose-500/20"
              }`}
            >
              Net: {summaryStats.netBalance >= 0 ? "+" : ""}
              {formatCurrency(summaryStats.netBalance)}
            </span>
          </div>
        </div>
      )}

      {/* Transactions List */}
      {isLoading ? (
        <div className="flex flex-col gap-2.5 py-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-16 w-full rounded-lg bg-muted/60 animate-pulse border border-border"
            />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-border bg-card/50">
          <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <DollarSign className="size-6 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground">No transactions found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            {hasActiveFilters
              ? "No transactions match your current search and filter criteria. Try clearing filters."
              : "No transactions recorded yet. Click 'Add Transaction' to get started."}
          </p>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" className="mt-4" onClick={onClearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {transactions.map((t) => (
            <TransactionRow
              key={t.id}
              transaction={t}
              onEdit={onEditTransaction}
              onDelete={onDeleteTransaction}
            />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 text-xs text-muted-foreground border-t border-border">
          <span>
            Page {page} of {totalPages} ({total} total entries)
          </span>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="size-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Next
              <ChevronRight className="size-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
