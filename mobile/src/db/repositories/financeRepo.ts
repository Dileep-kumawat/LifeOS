import { localRepo } from "./localRepo";
import { getDatabase } from "../database";
import type { LocalTransaction, LocalBudget, LocalCategory } from "../schema";

export interface CategorySpendSummary {
  category: string;
  amount: number;
  percentage: number;
}

export interface MonthlyTrendPoint {
  month: string; // YYYY-MM
  label: string; // e.g. "Aug"
  income: number;
  expense: number;
  net: number;
}

export interface FinanceSummaryData {
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  savingsRate: number; // 0 to 100
  categoryBreakdown: CategorySpendSummary[];
  monthlyTrends: MonthlyTrendPoint[];
}

export const financeRepo = {
  async createTransaction(
    tx: Omit<
      LocalTransaction,
      "id" | "syncStatus" | "lastModifiedAt" | "createdAt" | "updatedAt"
    > & { id?: string }
  ): Promise<LocalTransaction> {
    const created = (await localRepo.insert("transactions", tx)) as LocalTransaction;
    // Auto-update related budget currentSpend
    if (tx.type === "expense") {
      await this.recalculateBudgetSpends(tx.userId);
    }
    return created;
  },

  async updateTransaction(id: string, updates: Partial<LocalTransaction>): Promise<boolean> {
    const existing = await this.getTransactionById(id);
    const ok = await localRepo.update("transactions", id, updates);
    if (ok && existing) {
      await this.recalculateBudgetSpends(existing.userId);
    }
    return ok;
  },

  async deleteTransaction(id: string): Promise<boolean> {
    const existing = await this.getTransactionById(id);
    const ok = await localRepo.delete("transactions", id);
    if (ok && existing) {
      await this.recalculateBudgetSpends(existing.userId);
    }
    return ok;
  },

  async getTransactionById(id: string): Promise<LocalTransaction | null> {
    const db = await getDatabase();
    return db.getFirstAsync<LocalTransaction>("SELECT * FROM transactions WHERE id = ?;", id);
  },

  async listTransactions(
    userId: string,
    filters?: {
      type?: "income" | "expense";
      category?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
    }
  ): Promise<LocalTransaction[]> {
    const db = await getDatabase();
    let query = "SELECT * FROM transactions WHERE userId = ?";
    const params: any[] = [userId];

    if (filters?.type) {
      query += " AND type = ?";
      params.push(filters.type);
    }

    if (filters?.category) {
      query += " AND category = ?";
      params.push(filters.category);
    }

    if (filters?.startDate) {
      query += " AND date >= ?";
      params.push(filters.startDate);
    }

    if (filters?.endDate) {
      query += " AND date <= ?";
      params.push(filters.endDate);
    }

    if (filters?.search) {
      query += " AND (note LIKE ? OR category LIKE ?)";
      const term = `%${filters.search}%`;
      params.push(term, term);
    }

    query += " ORDER BY date DESC, createdAt DESC;";
    return db.getAllAsync<LocalTransaction>(query, ...params);
  },

  async createOrUpdateBudget(
    budget: Omit<
      LocalBudget,
      "id" | "syncStatus" | "lastModifiedAt" | "createdAt" | "updatedAt"
    > & {
      id?: string;
    }
  ): Promise<LocalBudget> {
    const db = await getDatabase();
    const existing = await db.getFirstAsync<LocalBudget>(
      "SELECT * FROM budgets WHERE userId = ? AND category = ? AND period = ?;",
      budget.userId,
      budget.category,
      budget.period || "monthly"
    );

    let result: LocalBudget;
    if (existing) {
      await localRepo.update("budgets", existing.id, {
        limit: budget.limit,
        period: budget.period || "monthly"
      });
      result = (await db.getFirstAsync<LocalBudget>(
        "SELECT * FROM budgets WHERE id = ?;",
        existing.id
      ))!;
    } else {
      result = (await localRepo.insert("budgets", budget)) as LocalBudget;
    }

    await this.recalculateBudgetSpends(budget.userId);
    return result;
  },

  async deleteBudget(id: string): Promise<boolean> {
    return localRepo.delete("budgets", id);
  },

  async listBudgets(userId: string): Promise<LocalBudget[]> {
    const db = await getDatabase();
    return db.getAllAsync<LocalBudget>(
      "SELECT * FROM budgets WHERE userId = ? ORDER BY category ASC;",
      userId
    );
  },

  async recalculateBudgetSpends(
    userId: string,
    targetMonthStr: string = new Date().toISOString().substring(0, 7) // "YYYY-MM"
  ): Promise<void> {
    const budgets = await this.listBudgets(userId);
    if (!budgets.length) return;

    const startOfMonth = `${targetMonthStr}-01`;
    const endOfMonth = `${targetMonthStr}-31T23:59:59`;

    const txs = await this.listTransactions(userId, {
      type: "expense",
      startDate: startOfMonth,
      endDate: endOfMonth
    });

    const spendMap: Record<string, number> = {};
    for (const tx of txs) {
      spendMap[tx.category] = (spendMap[tx.category] || 0) + Number(tx.amount || 0);
    }

    for (const b of budgets) {
      const currentSpend = spendMap[b.category] || 0;
      const notifiedOverspend = currentSpend > b.limit ? 1 : 0;
      await localRepo.update("budgets", b.id, {
        currentSpend,
        notifiedOverspend
      });
    }
  },

  async getFinanceSummary(
    userId: string,
    targetMonthStr: string = new Date().toISOString().substring(0, 7)
  ): Promise<FinanceSummaryData> {
    const allTxs = await this.listTransactions(userId);

    const [targetYear, targetMonth] = (targetMonthStr || new Date().toISOString().substring(0, 7))
      .split("-")
      .map(Number);
    const curMonthPrefix = `${targetYear}-${String(targetMonth).padStart(2, "0")}`;

    const monthTxs = allTxs.filter((t) => t.date && t.date.startsWith(curMonthPrefix));

    let totalIncome = 0;
    let totalExpense = 0;
    const catSpendMap: Record<string, number> = {};

    for (const tx of monthTxs) {
      const amt = Number(tx.amount || 0);
      if (tx.type === "income") {
        totalIncome += amt;
      } else {
        totalExpense += amt;
        catSpendMap[tx.category] = (catSpendMap[tx.category] || 0) + amt;
      }
    }

    const netSavings = totalIncome - totalExpense;
    const savingsRate =
      totalIncome > 0
        ? Math.max(0, Math.round(((totalIncome - totalExpense) / totalIncome) * 100))
        : 0;

    const categoryBreakdown: CategorySpendSummary[] = Object.entries(catSpendMap)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount);

    // Compute past 6 months trend using UTC date math
    const monthlyTrends: MonthlyTrendPoint[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(targetYear, targetMonth - 1 - i, 1, 12, 0, 0));
      const year = d.getUTCFullYear();
      const monthNum = d.getUTCMonth() + 1;
      const mStr = `${year}-${String(monthNum).padStart(2, "0")}`;
      const mLabel = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });

      const curTxs = allTxs.filter((t) => t.date && t.date.startsWith(mStr));

      let inc = 0;
      let exp = 0;
      for (const tx of curTxs) {
        if (tx.type === "income") inc += Number(tx.amount || 0);
        else exp += Number(tx.amount || 0);
      }

      monthlyTrends.push({
        month: mStr,
        label: mLabel,
        income: inc,
        expense: exp,
        net: inc - exp
      });
    }

    return {
      totalIncome,
      totalExpense,
      netSavings,
      savingsRate,
      categoryBreakdown,
      monthlyTrends
    };
  },

  async createCategory(
    cat: Omit<LocalCategory, "id" | "syncStatus" | "lastModifiedAt" | "createdAt" | "updatedAt"> & {
      id?: string;
    }
  ): Promise<LocalCategory> {
    return localRepo.insert("categories", cat) as Promise<LocalCategory>;
  },

  async listCategories(userId: string): Promise<LocalCategory[]> {
    const db = await getDatabase();
    return db.getAllAsync<LocalCategory>(
      "SELECT * FROM categories WHERE userId = ? ORDER BY name ASC;",
      userId
    );
  },

  async deleteCategory(id: string): Promise<boolean> {
    return localRepo.delete("categories", id);
  }
};
