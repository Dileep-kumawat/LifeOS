import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Tag } from "lucide-react";
import { toast } from "sonner";
import { financeApi } from "./api";
import type { Transaction, TransactionType } from "./types";
import { TransactionList } from "./components/TransactionList";
import { TransactionForm } from "./components/TransactionForm";
import { CategoryManager } from "./components/CategoryManager";
import { FinanceSummaryWidget } from "./components/FinanceSummaryWidget";
import { Button } from "../../components/Button";

export function FinancePage() {
  const queryClient = useQueryClient();

  // Filter & Pagination States
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedType, setSelectedType] = useState<TransactionType | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Modal States
  const [isTransactionFormOpen, setIsTransactionFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);

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

  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Finance & Budgeting</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track income, expenses, custom categories, and financial trends.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCategoryManagerOpen(true)}
            className="flex items-center gap-1.5"
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
            className="flex items-center gap-1.5"
          >
            <Plus className="size-4" />
            Add Transaction
          </Button>
        </div>
      </div>

      {/* Summary Cards & Trend */}
      <FinanceSummaryWidget summary={summaryData || null} isLoading={isSummaryLoading} />

      {/* Transactions List Section */}
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-foreground tracking-tight">Transactions</h2>
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
