export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
  note: string;
  receiptAttachment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  createdAt?: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface TransactionSummaryStats {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
}

export interface TransactionListResponse {
  data: Transaction[];
  pagination: Pagination;
  summary: TransactionSummaryStats;
}

export interface CategoryBreakdownItem {
  category: string;
  type: TransactionType;
  totalAmount: number;
  count: number;
}

export interface MonthlyTrendItem {
  month: string;
  income: number;
  expense: number;
  net: number;
}

export interface FinanceSummaryResponse {
  month: string;
  monthlyTotals: {
    income: number;
    expense: number;
    net: number;
  };
  categoryBreakdown: CategoryBreakdownItem[];
  trend: MonthlyTrendItem[];
}
