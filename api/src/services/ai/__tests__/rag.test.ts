import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock BullMQ queue
vi.mock("../../queue.js", () => ({
  enqueueJob: vi
    .fn()
    .mockResolvedValue({ queued: true, duplicate: false, jobId: "mock-embedding-job-id" })
}));

import {
  formatNoteForEmbedding,
  formatGoalForEmbedding,
  formatHabitForEmbedding,
  formatEventForEmbedding,
  formatTransactionForEmbedding,
  formatBudgetForEmbedding,
  formatSourceRecordForEmbedding
} from "../ragText.js";
import { generateEmbedding, generateMockEmbedding } from "../embeddings.js";
import { retrieveContext, cosineSimilarity } from "../retriever.js";
import { enqueueEmbeddingJob, processEmbeddingJob, deleteEmbedding } from "../embeddingJob.js";
import { enqueueJob } from "../../queue.js";
import { Embedding } from "../../../models/Embedding.js";
import { Note } from "../../../models/Note.js";

describe("RAG Pipeline Unit & Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── 1. Text Representation Conversion ──────────────────────────────────
  describe("Text Representation Extractor (ragText)", () => {
    it("extracts text from Note using title and contentText without re-parsing ProseMirror", () => {
      const mockNote: any = {
        title: "Meeting Notes",
        contentText: "Discussed Phase 3 AI roadmap and RAG pipeline.",
        tags: ["work", "ai"]
      };

      const result = formatNoteForEmbedding(mockNote);
      expect(result.title).toBe("Meeting Notes");
      expect(result.embeddedText).toContain("Note: Meeting Notes");
      expect(result.embeddedText).toContain("Discussed Phase 3 AI roadmap");
      expect(result.embeddedText).toContain("Tags: work, ai");
    });

    it("extracts text from Goal including milestones and progress", () => {
      const mockGoal: any = {
        title: "Run Half Marathon",
        description: "Train 4 days a week for 3 months.",
        status: "active",
        progressPercent: 50,
        targetDate: new Date("2026-10-01T00:00:00.000Z"),
        milestones: [
          { title: "Run 5k", completed: true },
          { title: "Run 10k", completed: false }
        ]
      };

      const result = formatGoalForEmbedding(mockGoal);
      expect(result.title).toBe("Run Half Marathon");
      expect(result.embeddedText).toContain("Goal: Run Half Marathon");
      expect(result.embeddedText).toContain("Status: active (50% complete)");
      expect(result.embeddedText).toContain("Milestones: [x] Run 5k; [ ] Run 10k");
    });

    it("extracts text from Habit including frequency and streak stats", () => {
      const mockHabit: any = {
        title: "Morning Meditation",
        frequency: { type: "daily", daysOfWeek: [], timesPerPeriod: 1 },
        currentStreak: 12,
        longestStreak: 30,
        completionRate: 0.85
      };

      const result = formatHabitForEmbedding(mockHabit);
      expect(result.title).toBe("Morning Meditation");
      expect(result.embeddedText).toContain("Habit: Morning Meditation");
      expect(result.embeddedText).toContain("Current Streak: 12 days");
      expect(result.embeddedText).toContain("Completion Rate: 85%");
    });

    it("extracts text from Calendar Event including location and timezone", () => {
      const mockEvent: any = {
        title: "Architecture Review",
        description: "Review RAG vector search design",
        location: "Room 404",
        startTime: new Date("2026-08-15T10:00:00.000Z"),
        endTime: new Date("2026-08-15T11:00:00.000Z"),
        timezone: "America/New_York"
      };

      const result = formatEventForEmbedding(mockEvent);
      expect(result.title).toBe("Architecture Review");
      expect(result.embeddedText).toContain("Event: Architecture Review");
      expect(result.embeddedText).toContain("Location: Room 404");
      expect(result.embeddedText).toContain("America/New_York");
    });

    it("extracts text from Transaction for embedding", () => {
      const mockTx: any = {
        amount: 45,
        type: "expense",
        category: "Groceries",
        date: new Date("2026-03-03T10:00:00.000Z"),
        note: "weekly shop"
      };

      const result = formatTransactionForEmbedding(mockTx);
      expect(result.title).toBe("Expense: $45 on Groceries");
      expect(result.embeddedText).toContain("Expense: $45 on Groceries");
      expect(result.embeddedText).toContain("Date: 2026-03-03");
      expect(result.embeddedText).toContain("note: weekly shop");
    });

    it("extracts text from Budget for embedding", () => {
      const mockBudget: any = {
        category: "Groceries",
        limit: 500,
        period: "monthly",
        currentSpend: 450
      };

      const result = formatBudgetForEmbedding(mockBudget);
      expect(result.title).toBe("Budget: $500 for Groceries");
      expect(result.embeddedText).toContain("Budget: $500 for Groceries");
      expect(result.embeddedText).toContain("Current Spend: $450");
      expect(result.embeddedText).toContain("90% used");
    });

    it("dispatches dynamically via formatSourceRecordForEmbedding", () => {
      const mockNote: any = { title: "Doc", contentText: "Content" };
      const res = formatSourceRecordForEmbedding("note", mockNote);
      expect(res.title).toBe("Doc");

      const mockTx: any = { amount: 100, type: "income", category: "Salary", date: new Date() };
      const resTx = formatSourceRecordForEmbedding("transaction", mockTx);
      expect(resTx.title).toContain("Income: $100 on Salary");

      const mockB: any = { category: "Food", limit: 300, currentSpend: 150 };
      const resB = formatSourceRecordForEmbedding("budget", mockB);
      expect(resB.title).toBe("Budget: $300 for Food");
    });
  });

  // ─── 2. Embedding Generation & Fallback ────────────────────────────────
  describe("Embedding Generation", () => {
    it("generates a normalized 1024-dimensional vector in test mode", async () => {
      const vector = await generateEmbedding("Sample text for vector search");
      expect(vector).toHaveLength(1024);

      // Verify L2 normalization
      const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
      expect(norm).toBeCloseTo(1.0, 4);
    });

    it("computes cosine similarity accurately", () => {
      const v1 = [1, 0, 0];
      const v2 = [1, 0, 0];
      const v3 = [0, 1, 0];

      expect(cosineSimilarity(v1, v2)).toBeCloseTo(1.0);
      expect(cosineSimilarity(v1, v3)).toBeCloseTo(0.0);
    });
  });

  // ─── 3. Embedding Job Enqueue & Processing ───────────────────────────────
  describe("Embedding Job Enqueue & Processing", () => {
    it("enqueues an embedding job with the proper dedupeKey and delay", async () => {
      const sourceType = "note";
      const sourceId = "662c9f1e9f0b2a001c3d4e5f";
      const userId = "662c9f1e9f0b2a001c3d4e50";

      await enqueueEmbeddingJob(sourceType, sourceId, userId);

      expect(enqueueJob).toHaveBeenCalledWith(
        "embedding",
        { sourceType, sourceId, userId },
        { dedupeKey: `embedding_note_${sourceId}`, delay: 0 }
      );
    });

    it("processEmbeddingJob upserts embedding and cleans up on missing source doc", async () => {
      const sourceId = "662c9f1e9f0b2a001c3d4e5f";
      const userId = "662c9f1e9f0b2a001c3d4e50";

      const mockNote = {
        _id: sourceId,
        userId,
        title: "Test Note",
        contentText: "Testing embedding job processing"
      };

      vi.spyOn(Note, "findOne").mockResolvedValue(mockNote as any);
      const findOneAndUpdateSpy = vi
        .spyOn(Embedding, "findOneAndUpdate")
        .mockResolvedValue({} as any);

      await processEmbeddingJob({
        id: "job-1",
        data: { sourceType: "note", sourceId, userId }
      } as any);

      expect(findOneAndUpdateSpy).toHaveBeenCalledWith(
        { sourceType: "note", sourceId },
        expect.objectContaining({
          userId,
          sourceType: "note",
          sourceId,
          title: "Test Note"
        }),
        { upsert: true, new: true, runValidators: true }
      );

      // Clean up when document is deleted
      vi.spyOn(Note, "findOne").mockResolvedValue(null);
      const deleteOneSpy = vi.spyOn(Embedding, "deleteOne").mockResolvedValue({} as any);

      await processEmbeddingJob({
        id: "job-2",
        data: { sourceType: "note", sourceId, userId }
      } as any);

      expect(deleteOneSpy).toHaveBeenCalledWith({ sourceType: "note", sourceId });
    });

    it("deleteEmbedding immediately removes embedding document from collection", async () => {
      const deleteOneSpy = vi.spyOn(Embedding, "deleteOne").mockResolvedValue({} as any);
      await deleteEmbedding("note", "note-123");
      expect(deleteOneSpy).toHaveBeenCalledWith({ sourceType: "note", sourceId: "note-123" });
    });
  });

  // ─── 4. Cross-User Security Isolation & Retriever ────────────────────────
  describe("Retriever Security & Per-User Isolation", () => {
    const userA_id = "662c9f1e9f0b2a001c3d4e0a";
    const userB_id = "662c9f1e9f0b2a001c3d4e0b";

    beforeEach(() => {
      // Generate query vector for "confidential notes on project X"
      const queryText = "confidential notes on project X";
      const targetVector = generateMockEmbedding(queryText);

      const store = [
        {
          _id: "emb-1",
          userId: userA_id,
          sourceType: "note",
          sourceId: "note-1",
          title: "User A Note",
          embeddedText: queryText,
          vector: targetVector
        },
        {
          _id: "emb-2",
          userId: userB_id,
          sourceType: "note",
          sourceId: "note-2",
          title: "User B Note",
          embeddedText: queryText,
          vector: targetVector
        }
      ];

      vi.spyOn(Embedding, "aggregate").mockResolvedValue([]);
      vi.spyOn(Embedding, "find").mockImplementation(((filter: any) => {
        const matches = store.filter((d) => d.userId === filter.userId);
        return {
          lean: async () => matches
        } as any;
      }) as any);
    });

    it("HARD SECURITY BOUNDARY: User A query NEVER returns User B data", async () => {
      const query = "confidential notes on project X";

      const userAResult = await retrieveContext(userA_id, query);
      expect(userAResult.results.length).toBeGreaterThan(0);
      expect(userAResult.results.every((item) => item.title === "User A Note")).toBe(true);

      const userBResult = await retrieveContext(userB_id, query);
      expect(userBResult.results.length).toBeGreaterThan(0);
      expect(userBResult.results.every((item) => item.title === "User B Note")).toBe(true);
    });

    it("returns clean empty result when user has no data", async () => {
      const newUser_id = "662c9f1e9f0b2a001c3d9999";
      const result = await retrieveContext(newUser_id, "Any query");
      expect(result.results).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("returns clean empty result for empty or whitespace query", async () => {
      const result = await retrieveContext(userA_id, "   ");
      expect(result.results).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });
});
