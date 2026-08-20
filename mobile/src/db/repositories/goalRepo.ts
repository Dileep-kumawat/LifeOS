import { localRepo } from "./localRepo";
import { getDatabase } from "../database";
import type { LocalGoal } from "../schema";

export interface GoalMilestoneItem {
  id: string;
  title: string;
  targetDate?: string | null;
  completed: boolean;
  completedAt?: string | null;
}

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

  async getGoalById(id: string): Promise<LocalGoal | null> {
    const db = await getDatabase();
    return db.getFirstAsync<LocalGoal>("SELECT * FROM goals WHERE id = ?;", id);
  },

  async listGoals(userId: string): Promise<LocalGoal[]> {
    const db = await getDatabase();
    return db.getAllAsync<LocalGoal>(
      "SELECT * FROM goals WHERE userId = ? ORDER BY createdAt DESC;",
      userId
    );
  },

  async toggleMilestone(
    goalId: string,
    milestoneId: string
  ): Promise<{ goal: LocalGoal | null; milestone: GoalMilestoneItem | null }> {
    const goal = await this.getGoalById(goalId);
    if (!goal) return { goal: null, milestone: null };

    let milestones: GoalMilestoneItem[] = [];
    try {
      milestones = JSON.parse(goal.milestones || "[]");
    } catch {
      milestones = [];
    }

    let updatedMilestone: GoalMilestoneItem | null = null;

    milestones = milestones.map((m) => {
      if (m.id === milestoneId) {
        const nextCompleted = !m.completed;
        updatedMilestone = {
          ...m,
          completed: nextCompleted,
          completedAt: nextCompleted ? new Date().toISOString() : null
        };
        return updatedMilestone;
      }
      return m;
    });

    const total = milestones.length;
    const completedCount = milestones.filter((m) => m.completed).length;
    const progressPercent =
      total > 0 ? Math.round((completedCount / total) * 100) : goal.progressPercent;
    const nextStatus =
      total > 0 && completedCount === total
        ? "completed"
        : goal.status === "completed"
          ? "active"
          : goal.status;

    await this.updateGoal(goalId, {
      milestones: JSON.stringify(milestones),
      progressPercent,
      status: nextStatus
    });

    const updatedGoal = await this.getGoalById(goalId);
    return { goal: updatedGoal, milestone: updatedMilestone };
  },

  async addMilestone(
    goalId: string,
    title: string,
    targetDate?: string | null
  ): Promise<LocalGoal | null> {
    const goal = await this.getGoalById(goalId);
    if (!goal) return null;

    let milestones: GoalMilestoneItem[] = [];
    try {
      milestones = JSON.parse(goal.milestones || "[]");
    } catch {
      milestones = [];
    }

    const newMilestone: GoalMilestoneItem = {
      id: "ms_" + Math.random().toString(36).substring(2, 10),
      title: title.trim(),
      targetDate: targetDate || null,
      completed: false,
      completedAt: null
    };

    milestones.push(newMilestone);

    const completedCount = milestones.filter((m) => m.completed).length;
    const progressPercent = Math.round((completedCount / milestones.length) * 100);

    await this.updateGoal(goalId, {
      milestones: JSON.stringify(milestones),
      progressPercent
    });

    return this.getGoalById(goalId);
  },

  async deleteMilestone(goalId: string, milestoneId: string): Promise<LocalGoal | null> {
    const goal = await this.getGoalById(goalId);
    if (!goal) return null;

    let milestones: GoalMilestoneItem[] = [];
    try {
      milestones = JSON.parse(goal.milestones || "[]");
    } catch {
      milestones = [];
    }

    milestones = milestones.filter((m) => m.id !== milestoneId);

    const progressPercent =
      milestones.length > 0
        ? Math.round((milestones.filter((m) => m.completed).length / milestones.length) * 100)
        : 0;

    await this.updateGoal(goalId, {
      milestones: JSON.stringify(milestones),
      progressPercent
    });

    return this.getGoalById(goalId);
  }
};
