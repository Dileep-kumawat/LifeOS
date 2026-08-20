import { apiClient } from "../../lib/apiClient";
import type {
  Budget,
  BudgetDetail,
  Category,
  CreateBudgetInput,
  FinanceInsightsResponse,
  FinanceSummaryResponse,
  Transaction,
  TransactionListResponse,
  TransactionType,
  UpdateBudgetInput
} from "./types";

export interface ListTransactionsParams {
  category?: string;
  type?: TransactionType;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const financeApi = {
  async listTransactions(params?: ListTransactionsParams): Promise<TransactionListResponse> {
    const response = await apiClient.get<TransactionListResponse>("/finance/transactions", {
      params
    });
    return response.data;
  },

  async getTransaction(id: string): Promise<Transaction> {
    const response = await apiClient.get<Transaction>(`/finance/transactions/${id}`);
    return response.data;
  },

  async createTransaction(input: {
    amount: number;
    type: TransactionType;
    category: string;
    date?: string;
    note?: string;
    receiptAttachment?: string | null;
  }): Promise<Transaction> {
    const response = await apiClient.post<Transaction>("/finance/transactions", input);
    return response.data;
  },

  async updateTransaction(
    id: string,
    input: Partial<{
      amount: number;
      type: TransactionType;
      category: string;
      date: string;
      note: string;
      receiptAttachment: string | null;
    }>
  ): Promise<Transaction> {
    const response = await apiClient.patch<Transaction>(`/finance/transactions/${id}`, input);
    return response.data;
  },

  async deleteTransaction(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/finance/transactions/${id}`);
    return response.data;
  },

  async listCategories(): Promise<Category[]> {
    const response = await apiClient.get<{ categories: Category[] }>("/finance/categories");
    return response.data.categories;
  },

  async createCategory(input: { name: string; type: TransactionType }): Promise<Category> {
    const response = await apiClient.post<Category>("/finance/categories", input);
    return response.data;
  },

  async updateCategory(id: string, input: { name: string }): Promise<Category> {
    const response = await apiClient.patch<Category>(`/finance/categories/${id}`, input);
    return response.data;
  },

  async deleteCategory(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/finance/categories/${id}`);
    return response.data;
  },

  async getSummary(params?: { month?: string; months?: number }): Promise<FinanceSummaryResponse> {
    const response = await apiClient.get<FinanceSummaryResponse>("/finance/summary", { params });
    return response.data;
  },

  async listBudgets(): Promise<Budget[]> {
    const response = await apiClient.get<{ budgets: Budget[] }>("/finance/budgets");
    return response.data.budgets;
  },

  async getBudget(id: string): Promise<BudgetDetail> {
    const response = await apiClient.get<BudgetDetail>(`/finance/budgets/${id}`);
    return response.data;
  },

  async createBudget(input: CreateBudgetInput): Promise<Budget> {
    const response = await apiClient.post<Budget>("/finance/budgets", input);
    return response.data;
  },

  async updateBudget(id: string, input: UpdateBudgetInput): Promise<Budget> {
    const response = await apiClient.patch<Budget>(`/finance/budgets/${id}`, input);
    return response.data;
  },

  async deleteBudget(id: string): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/finance/budgets/${id}`);
    return response.data;
  },

  async getInsights(focusArea?: string): Promise<FinanceInsightsResponse> {
    const response = await apiClient.post<FinanceInsightsResponse>("/finance/insights", {
      focusArea
    });
    return response.data;
  }
};
