import { localRepo } from "./localRepo";
import { getDatabase } from "../database";
import type { LocalTopic } from "../schema";

export interface ListTopicsOptions {
  subjectId?: string;
  status?: "not_started" | "in_progress" | "completed";
}

export const topicRepo = {
  /**
   * Create a new topic with local-first optimistic write
   */
  async createTopic(
    topic: Omit<
      LocalTopic,
      "id" | "syncStatus" | "lastModifiedAt" | "createdAt" | "updatedAt"
    > & { id?: string }
  ): Promise<LocalTopic> {
    return localRepo.insert("topics", {
      ...topic,
      priority: topic.priority || "medium",
      status: topic.status || "not_started",
      deadline: topic.deadline || null,
      estimatedMinutes: topic.estimatedMinutes != null ? Number(topic.estimatedMinutes) : null
    }) as Promise<LocalTopic>;
  },

  /**
   * Update an existing topic
   */
  async updateTopic(id: string, updates: Partial<LocalTopic>): Promise<boolean> {
    return localRepo.update("topics", id, updates);
  },

  /**
   * Cascade-delete topic and its child flashcards
   */
  async deleteTopic(id: string): Promise<boolean> {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM flashcards WHERE topicId = ?;", id);
    return localRepo.delete("topics", id);
  },

  /**
   * Retrieve a topic by ID
   */
  async getTopicById(id: string): Promise<LocalTopic | null> {
    const db = await getDatabase();
    return db.getFirstAsync<LocalTopic>("SELECT * FROM topics WHERE id = ?;", id);
  },

  /**
   * List topics for a user with optional subject/status filtering
   */
  async listTopics(userId: string, options: ListTopicsOptions = {}): Promise<LocalTopic[]> {
    const db = await getDatabase();
    if (options.subjectId) {
      return db.getAllAsync<LocalTopic>(
        "SELECT * FROM topics WHERE userId = ? AND subjectId = ? ORDER BY createdAt DESC;",
        userId,
        options.subjectId
      );
    }

    return db.getAllAsync<LocalTopic>(
      "SELECT * FROM topics WHERE userId = ? ORDER BY createdAt DESC;",
      userId
    );
  },

  /**
   * Aggregate total focus minutes spent on this topic from local focus sessions
   */
  async getTopicFocusMinutes(topicId: string): Promise<number> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      "SELECT totalFocusMinutes FROM focus_sessions WHERE linkedType = 'topic' AND linkedId = ?;",
      topicId
    );
    return rows.reduce((sum, r) => sum + (Number(r.totalFocusMinutes) || 0), 0);
  }
};
