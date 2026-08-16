import { localRepo } from "./localRepo";
import { getDatabase } from "../database";
import type { LocalHabit, LocalHabitCheckIn } from "../schema";

export const habitRepo = {
  async createHabit(
    habit: Omit<LocalHabit, "id" | "syncStatus" | "lastModifiedAt" | "createdAt" | "updatedAt"> & {
      id?: string;
    }
  ): Promise<LocalHabit> {
    return localRepo.insert("habits", habit) as Promise<LocalHabit>;
  },

  async updateHabit(id: string, updates: Partial<LocalHabit>): Promise<boolean> {
    return localRepo.update("habits", id, updates);
  },

  async deleteHabit(id: string): Promise<boolean> {
    return localRepo.delete("habits", id);
  },

  async listHabits(userId: string): Promise<LocalHabit[]> {
    const db = await getDatabase();
    return db.getAllAsync<LocalHabit>("SELECT * FROM habits WHERE userId = ?;", userId);
  },

  async recordCheckIn(
    checkIn: Omit<
      LocalHabitCheckIn,
      "id" | "syncStatus" | "lastModifiedAt" | "createdAt" | "updatedAt"
    > & { id?: string }
  ): Promise<LocalHabitCheckIn> {
    return localRepo.insert("habit_check_ins", checkIn) as Promise<LocalHabitCheckIn>;
  },

  async getCheckIns(habitId: string): Promise<LocalHabitCheckIn[]> {
    const db = await getDatabase();
    return db.getAllAsync<LocalHabitCheckIn>(
      "SELECT * FROM habit_check_ins WHERE habitId = ?;",
      habitId
    );
  }
};
