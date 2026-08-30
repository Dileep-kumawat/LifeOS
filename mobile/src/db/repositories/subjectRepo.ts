import { localRepo } from "./localRepo";
import { getDatabase } from "../database";
import type { LocalSubject } from "../schema";

export const subjectRepo = {
  /**
   * Create a new subject with local-first optimistic write
   */
  async createSubject(
    subject: Omit<
      LocalSubject,
      "id" | "syncStatus" | "lastModifiedAt" | "createdAt" | "updatedAt"
    > & { id?: string }
  ): Promise<LocalSubject> {
    return localRepo.insert("subjects", {
      ...subject,
      color: subject.color || "#0075de",
      examDate: subject.examDate || null
    }) as Promise<LocalSubject>;
  },

  /**
   * Update an existing subject
   */
  async updateSubject(id: string, updates: Partial<LocalSubject>): Promise<boolean> {
    return localRepo.update("subjects", id, updates);
  },

  /**
   * Cascade-delete subject, its child topics, and child flashcards
   */
  async deleteSubject(id: string): Promise<boolean> {
    const db = await getDatabase();
    // Cascade-delete flashcards and topics belonging to this subject
    await db.runAsync("DELETE FROM flashcards WHERE subjectId = ?;", id);
    await db.runAsync("DELETE FROM topics WHERE subjectId = ?;", id);
    return localRepo.delete("subjects", id);
  },

  /**
   * Retrieve a subject by ID
   */
  async getSubjectById(id: string): Promise<LocalSubject | null> {
    const db = await getDatabase();
    return db.getFirstAsync<LocalSubject>("SELECT * FROM subjects WHERE id = ?;", id);
  },

  /**
   * List all subjects for a user
   */
  async listSubjects(userId: string): Promise<LocalSubject[]> {
    const db = await getDatabase();
    return db.getAllAsync<LocalSubject>(
      "SELECT * FROM subjects WHERE userId = ? ORDER BY createdAt DESC;",
      userId
    );
  }
};
