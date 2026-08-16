import { localRepo } from "./localRepo";
import { getDatabase } from "../database";
import type { LocalTransaction, LocalBudget, LocalCategory } from "../schema";

export const financeRepo = {
  async createTransaction(
    tx: Omit<
      LocalTransaction,
      "id" | "syncStatus" | "lastModifiedAt" | "createdAt" | "updatedAt"
    > & { id?: string }
  ): Promise<LocalTransaction> {
    return localRepo.insert("transactions", tx) as Promise<LocalTransaction>;
  },

  async updateTransaction(id: string, updates: Partial<LocalTransaction>): Promise<boolean> {
    return localRepo.update("transactions", id, updates);
  },

  async deleteTransaction(id: string): Promise<boolean> {
    return localRepo.delete("transactions", id);
  },

  async listTransactions(userId: string): Promise<LocalTransaction[]> {
    const db = await getDatabase();
    return db.getAllAsync<LocalTransaction>(
      "SELECT * FROM transactions WHERE userId = ? ORDER BY date DESC;",
      userId
    );
  },

  async createOrUpdateBudget(
    budget: Omit<LocalBudget, "id" | "syncStatus" | "lastModifiedAt" | "createdAt" | "updatedAt"> & {
      id?: string;
    }
  ): Promise<LocalBudget> {
    return localRepo.insert("budgets", budget) as Promise<LocalBudget>;
  },

  async listBudgets(userId: string): Promise<LocalBudget[]> {
    const db = await getDatabase();
    return db.getAllAsync<LocalBudget>("SELECT * FROM budgets WHERE userId = ?;", userId);
  },

  async createCategory(
    cat: Omit<LocalCategory, "id" | "syncStatus" | "lastModifiedAt" | "createdAt" | "updatedAt"> & {
      id?: string;
    }
  ): Promise<LocalCategory> {
    return localRepo.insert("categories", cat) as Promise<LocalCategory>;
  }
};
