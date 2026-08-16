import { localRepo } from "./localRepo";
import { getDatabase } from "../database";
import type { LocalGoal } from "../schema";

export const goalRepo = {
  async createGoal(
    goal: Omit<LocalGoal, "id" | "syncStatus" | "lastModifiedAt" | "createdAt" | "updatedAt"> & {
      id?: string;
    }
  ): Promise<LocalGoal> {
    return localRepo.insert("goals", goal) as Promise<LocalGoal>;
  },

  async updateGoal(id: string, updates: Partial<LocalGoal>): Promise<boolean> {
    return localRepo.update("goals", id, updates);
  },

  async deleteGoal(id: string): Promise<boolean> {
    return localRepo.delete("goals", id);
  },

  async listGoals(userId: string): Promise<LocalGoal[]> {
    const db = await getDatabase();
    return db.getAllAsync<LocalGoal>(
      "SELECT * FROM goals WHERE userId = ? ORDER BY createdAt DESC;",
      userId
    );
  }
};
