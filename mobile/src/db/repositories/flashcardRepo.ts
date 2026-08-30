import { localRepo } from "./localRepo";
import { getDatabase } from "../database";
import type { LocalFlashcard } from "../schema";
import { calculateNextReview } from "@lifeos/shared";

export interface ListFlashcardsOptions {
  subjectId?: string;
  topicId?: string;
}

export const flashcardRepo = {
  /**
   * Create a new flashcard with local-first optimistic write
   */
  async createFlashcard(
    card: Omit<
      LocalFlashcard,
      "id" | "syncStatus" | "lastModifiedAt" | "createdAt" | "updatedAt" | "easeFactor" | "intervalDays" | "repetitions" | "nextReviewDate"
    > & {
      id?: string;
      easeFactor?: number;
      intervalDays?: number;
      repetitions?: number;
      nextReviewDate?: string;
    }
  ): Promise<LocalFlashcard> {
    return localRepo.insert("flashcards", {
      ...card,
      subjectId: card.subjectId || null,
      topicId: card.topicId || null,
      easeFactor: card.easeFactor != null ? Number(card.easeFactor) : 2.5,
      intervalDays: card.intervalDays != null ? Number(card.intervalDays) : 0,
      repetitions: card.repetitions != null ? Number(card.repetitions) : 0,
      nextReviewDate: card.nextReviewDate || new Date().toISOString()
    }) as Promise<LocalFlashcard>;
  },

  /**
   * Update an existing flashcard
   */
  async updateFlashcard(id: string, updates: Partial<LocalFlashcard>): Promise<boolean> {
    return localRepo.update("flashcards", id, updates);
  },

  /**
   * Delete a flashcard
   */
  async deleteFlashcard(id: string): Promise<boolean> {
    return localRepo.delete("flashcards", id);
  },

  /**
   * Retrieve a flashcard by ID
   */
  async getFlashcardById(id: string): Promise<LocalFlashcard | null> {
    const db = await getDatabase();
    return db.getFirstAsync<LocalFlashcard>("SELECT * FROM flashcards WHERE id = ?;", id);
  },

  /**
   * List flashcards for a user with optional subject/topic filtering
   */
  async listFlashcards(
    userId: string,
    options: ListFlashcardsOptions = {}
  ): Promise<LocalFlashcard[]> {
    const db = await getDatabase();
    if (options.topicId) {
      return db.getAllAsync<LocalFlashcard>(
        "SELECT * FROM flashcards WHERE userId = ? AND topicId = ? ORDER BY createdAt DESC;",
        userId,
        options.topicId
      );
    }
    if (options.subjectId) {
      return db.getAllAsync<LocalFlashcard>(
        "SELECT * FROM flashcards WHERE userId = ? AND subjectId = ? ORDER BY createdAt DESC;",
        userId,
        options.subjectId
      );
    }

    return db.getAllAsync<LocalFlashcard>(
      "SELECT * FROM flashcards WHERE userId = ? ORDER BY createdAt DESC;",
      userId
    );
  },

  /**
   * Query flashcards due for spaced repetition review (nextReviewDate <= now)
   */
  async getDueFlashcards(
    userId: string,
    now: Date = new Date()
  ): Promise<LocalFlashcard[]> {
    const db = await getDatabase();
    const nowIso = now.toISOString();
    const cards = await db.getAllAsync<LocalFlashcard>(
      "SELECT * FROM flashcards WHERE userId = ? AND nextReviewDate <= ? ORDER BY nextReviewDate ASC;",
      userId,
      nowIso
    );
    return cards;
  },

  /**
   * Process a user self-assessment review using SM-2 algorithm
   */
  async reviewFlashcard(
    id: string,
    quality: number,
    baseDate: Date = new Date()
  ): Promise<LocalFlashcard | null> {
    const card = await this.getFlashcardById(id);
    if (!card) return null;

    const sm2Result = calculateNextReview(
      {
        easeFactor: card.easeFactor,
        intervalDays: card.intervalDays,
        repetitions: card.repetitions,
        nextReviewDate: card.nextReviewDate
      },
      quality,
      baseDate
    );

    const updates: Partial<LocalFlashcard> = {
      easeFactor: sm2Result.easeFactor,
      intervalDays: sm2Result.intervalDays,
      repetitions: sm2Result.repetitions,
      nextReviewDate: sm2Result.nextReviewDate.toISOString()
    };

    await this.updateFlashcard(id, updates);
    return this.getFlashcardById(id);
  }
};
