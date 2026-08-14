import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Tag, PieChart, Wallet } from "lucide-react";
import { toast } from "sonner";
import { financeApi } from "./api";
import type { Budget, BudgetDetail, Transaction, TransactionType } from "./types";
import { TransactionList } from "./components/TransactionList";
import { TransactionForm } from "./components/TransactionForm";
import { CategoryManager } from "./components/CategoryManager";
import { FinanceSummaryWidget } from "./components/FinanceSummaryWidget";
import { BudgetList } from "./components/BudgetList";
import { BudgetForm } from "./components/BudgetForm";
import { BudgetDetailDialog } from "./components/BudgetDetailDialog";
import { CategoryBreakdownChart } from "./components/CategoryBreakdownChart";
import { TrendLineChart } from "./components/TrendLineChart";
import { InsightsCard } from "./components/InsightsCard";
import { Button } from "../../components/Button";

export function FinancePage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get("tab") || "transactions";
  const targetBudgetId = searchParams.get("budgetId");

  // Filter & Pagination States for Transactions
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedType, setSelectedType] = useState<TransactionType | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Transaction & Category Modals
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);

  // Budget Modals & States
  const [isBudgetFormOpen, setIsBudgetFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [selectedBudgetDetail, setSelectedBudgetDetail] = useState<BudgetDetail | null>(null);
  const [budgetFormError, setBudgetFormError] = useState<string | null>(null);
  const [isBudgetSubmitting, setIsBudgetSubmitting] = useState(false);

  // 1. Fetch Categories
  const { data: categories = [] } = useQuery({
    queryKey: ["finance", "categories"],
    queryFn: () => financeApi.listCategories()
  });

  // 2. Fetch Transactions List
  const { data: listResponse, isLoading: isListLoading } = useQuery({
    queryKey: [
      "finance",
      "transactions",
      { category: selectedCategory, type: selectedType, startDate, endDate, search, page }
    ],
    queryFn: () =>
      financeApi.listTransactions({
        category: selectedCategory || undefined,
        type: selectedType || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        search: search || undefined,
        page,
        limit: 20
      })
  });

  // 3. Fetch Monthly Summary & Trend
  const { data: summaryData, isLoading: isSummaryLoading } = useQuery({
    queryKey: ["finance", "summary"],
    queryFn: () => financeApi.getSummary()
  });

  // 4. Fetch Budgets
  const { data: budgets = [], isLoading: isBudgetsLoading } = useQuery({
    queryKey: ["finance", "budgets"],
    queryFn: () => financeApi.listBudgets()
  });

  // Deep Link handler: open specific budget detail when budgetId is in URL query
  useEffect(() => {
    if (targetBudgetId) {
      financeApi
        .getBudget(targetBudgetId)
        .then((detail) => {
          setSelectedBudgetDetail(detail);
        })
        .catch(() => {
          toast.error("Requested budget not found");
        });
    }
  }, [targetBudgetId]);

  const setTab = (tab: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", tab);
    nextParams.delete("budgetId");
    setSearchParams(nextParams);
  };

  const invalidateFinanceQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["finance"] });
  };

  const handleClearFilters = () => {
    setSelectedCategory("");
    setSelectedType("");
    setStartDate("");
    setEndDate("");
    setSearch("");
    setPage(1);
  };

  // Transaction Handlers
  const handleSaveTransaction = async (data: any) => {
    try {
      if (editingTransaction) {
        await financeApi.updateTransaction(editingTransaction.id, data);
        toast.success("Transaction updated successfully");
      } else {
        await financeApi.createTransaction(data);
        toast.success("Transaction created successfully");
      }
      invalidateFinanceQueries();
      setEditingTransaction(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save transaction");
      throw err;
    }
  };

  const handleDeleteTransaction = async (t: Transaction) => {
    if (!window.confirm("Are you sure you want to delete this transaction?")) return;
    try {
      await financeApi.deleteTransaction(t.id);
      toast.success("Transaction deleted");
      invalidateFinanceQueries();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete transaction");
    }
  };

  // Category Handlers
  const handleCreateCategory = async (name: string, type: TransactionType): Promise<string> => {
    try {
      const created = await financeApi.createCategory({ name, type });
      toast.success(`Category "${created.name}" created`);
      invalidateFinanceQueries();
      return created.name;
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create category");
      throw err;
    }
  };

  const handleRenameCategory = async (id: string, name: string) => {
    try {
      await financeApi.updateCategory(id, { name });
      toast.success("Category renamed");
      invalidateFinanceQueries();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to rename category");
      throw err;
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const res = await financeApi.deleteCategory(id);
      toast.success(res.message || "Category deleted");
      invalidateFinanceQueries();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete category");
      throw err;
    }
  };

  // Budget Handlers
  const handleSaveBudget = async (values: { category: string; limit: number; period: "monthly" }) => {
    setBudgetFormError(null);
    setIsBudgetSubmitting(true);
    try {
      if (editingBudget) {
        await financeApi.updateBudget(editingBudget.id, { limit: values.limit });
        toast.success("Budget limit updated");
      } else {
        await financeApi.createBudget(values);
        toast.success("Budget created successfully");
      }
      invalidateFinanceQueries();
      setIsBudgetFormOpen(false);
      setEditingBudget(null);
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to save budget";
      setBudgetFormError(msg);
      toast.error(msg);
    } finally {
      setIsBudgetSubmitting(false);
    }
  };

  const handleDeleteBudget = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this budget?")) return;
    try {
      await financeApi.deleteBudget(id);
      toast.success("Budget deleted");
      setSelectedBudgetDetail(null);
      invalidateFinanceQueries();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete budget");
    }
  };

  const handleSelectBudget = async (b: Budget) => {
    try {
      const detail = await financeApi.getBudget(b.id);
      setSelectedBudgetDetail(detail);
    } catch {
      toast.error("Failed to load budget details");
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 max-w-6xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">Finance & Budgeting</h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Manage transactions, set category budgets, and analyze spending trends.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCategoryManagerOpen(true)}
            className="flex items-center gap-1.5 text-xs sm:text-sm"
          >
            <Tag className="size-4" />
            Categories
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setEditingTransaction(null);
              setIsTransactionFormOpen(true);
            }}
            className="flex items-center gap-1.5 text-xs sm:text-sm"
          >
            <Plus className="size-4" />
            Add Transaction
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-neutral-200 pb-1">
        <button
          onClick={() => setTab("transactions")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "transactions"
              ? "border-[#0075de] text-[#0075de]"
              : "border-transparent text-neutral-600 hover:text-neutral-900"
          }`}
        >
          <Wallet className="size-4" />
          Transactions
        </button>
        <button
          onClick={() => setTab("budgets")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "budgets"
              ? "border-[#0075de] text-[#0075de]"
              : "border-transparent text-neutral-600 hover:text-neutral-900"
          }`}
        >
          <PieChart className="size-4" />
          Budgets
          {budgets.some((b) => b.isOverBudget) && (
            <span className="size-2 rounded-full bg-red-600 animate-pulse" />
          )}
        </button>
      </div>

      {/* Tab 1: Transactions View */}
      {activeTab === "transactions" && (
        <div className="flex flex-col gap-6">
          <FinanceSummaryWidget summary={summaryData || null} isLoading={isSummaryLoading} />
          
          <InsightsCard />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CategoryBreakdownChart data={summaryData?.categoryBreakdown || []} />
            <TrendLineChart data={summaryData?.trend || []} />
          </div>

          <TransactionList
            transactions={listResponse?.data || []}
            categories={categories}
            total={listResponse?.pagination.total || 0}
            page={page}
            limit={listResponse?.pagination.limit || 20}
            totalPages={listResponse?.pagination.totalPages || 1}
            summaryStats={listResponse?.summary}
            isLoading={isListLoading}
            selectedCategory={selectedCategory}
            onSelectCategory={(cat) => {
              setSelectedCategory(cat);
              setPage(1);
            }}
            selectedType={selectedType}
            onSelectType={(type) => {
              setSelectedType(type);
              setPage(1);
            }}
            startDate={startDate}
            onSelectStartDate={(d) => {
              setStartDate(d);
              setPage(1);
            }}
            endDate={endDate}
            onSelectEndDate={(d) => {
              setEndDate(d);
              setPage(1);
            }}
            search={search}
            onSearchChange={(s) => {
              setSearch(s);
              setPage(1);
            }}
            onPageChange={setPage}
            onEditTransaction={(t) => {
              setEditingTransaction(t);
              setIsTransactionFormOpen(true);
            }}
            onDeleteTransaction={handleDeleteTransaction}
            onClearFilters={handleClearFilters}
          />
        </div>
      )}

      {/* Tab 2: Budgets View */}
      {activeTab === "budgets" && (
        <BudgetList
          budgets={budgets}
          isLoading={isBudgetsLoading}
          onSelectBudget={handleSelectBudget}
          onCreateBudget={() => {
            setEditingBudget(null);
            setBudgetFormError(null);
            setIsBudgetFormOpen(true);
          }}
          onEditBudget={(b) => {
            setEditingBudget(b);
            setBudgetFormError(null);
            setIsBudgetFormOpen(true);
          }}
          onDeleteBudget={handleDeleteBudget}
        />
      )}

      {/* Budget Form Modal */}
      {isBudgetFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <BudgetForm
            categories={categories}
            initialValues={
              editingBudget
                ? { id: editingBudget.id, category: editingBudget.category, limit: editingBudget.limit }
                : undefined
            }
            onSubmit={handleSaveBudget}
            onCancel={() => {
              setIsBudgetFormOpen(false);
              setEditingBudget(null);
              setBudgetFormError(null);
            }}
            errorMessage={budgetFormError}
            isSubmitting={isBudgetSubmitting}
          />
        </div>
      )}

      {/* Budget Detail Dialog */}
      <BudgetDetailDialog
        budget={selectedBudgetDetail}
        isOpen={Boolean(selectedBudgetDetail)}
        onClose={() => {
          setSelectedBudgetDetail(null);
          if (targetBudgetId) {
            setTab("budgets");
          }
        }}
        onEdit={(b) => {
          setSelectedBudgetDetail(null);
          setEditingBudget(b);
          setIsBudgetFormOpen(true);
        }}
        onDelete={handleDeleteBudget}
      />

      {/* Transaction Form Modal */}
      <TransactionForm
        isOpen={isTransactionFormOpen}
        onClose={() => {
          setIsTransactionFormOpen(false);
          setEditingTransaction(null);
        }}
        onSubmit={handleSaveTransaction}
        categories={categories}
        initialData={editingTransaction}
        onAddCategory={handleCreateCategory}
      />

      {/* Category Manager Modal */}
      <CategoryManager
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
        categories={categories}
        onCreateCategory={handleCreateCategory}
        onRenameCategory={handleRenameCategory}
        onDeleteCategory={handleDeleteCategory}
      />
    </div>
  );
}
