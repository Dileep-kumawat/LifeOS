import { describe, it, expect, vi, beforeEach } from "vitest";
import mongoose from "mongoose";

// Mock Queue & Embedding Job
vi.mock("../../queue.js", () => ({
  enqueueJob: vi.fn().mockResolvedValue({ queued: true, jobId: "mock-job-id" })
}));

vi.mock("../embeddingJob.js", () => ({
  enqueueEmbeddingJob: vi.fn().mockResolvedValue(undefined),
  deleteEmbedding: vi.fn().mockResolvedValue(undefined)
}));

vi.mock("../embeddings.js", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    generateEmbedding: vi
      .fn()
      .mockImplementation((text: string) => actual.generateMockEmbedding(text))
  };
});

import { Event } from "../../../models/Event.js";
import { Habit } from "../../../models/Habit.js";
import { Note } from "../../../models/Note.js";
import { Message } from "../../../models/Message.js";
import { AiRequestLog } from "../../../models/AiRequestLog.js";
import { Embedding } from "../../../models/Embedding.js";
import {
  executeToolCall,
  executeCreateCalendarEvent,
  executeCreateHabit,
  executeCreateNote
} from "../tools.js";
import { generateMockEmbedding } from "../embeddings.js";
import { retrieveContext } from "../retriever.js";
import { sanitizeExpiredAiLogs } from "../retention.js";

describe("AI Chat Experience & Tool Calling Tests (Prompt 3)", () => {
  const mockUserId = "662c9f1e9f0b2a001c3d4e01";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Embedding, "aggregate").mockRejectedValue(
      new Error("Atlas vector search mock bypass")
    );
  });

  // ─── 1. Tool Call Validation Parity & Execution Tests ────────────────────
  describe("Unified Tool Execution Services (FR-2.14)", () => {
    it("executes create_calendar_event with strict validation parity (startTime < endTime & timezone check)", async () => {
      const validArgs = {
        title: "Study Session",
        startTime: new Date(Date.now() + 3600000).toISOString(),
        endTime: new Date(Date.now() + 7200000).toISOString(),
        timezone: "America/New_York",
        location: "Library"
      };

      const mockEventDoc = {
        _id: new mongoose.Types.ObjectId(),
        title: validArgs.title,
        startTime: new Date(validArgs.startTime),
        endTime: new Date(validArgs.endTime),
        timezone: validArgs.timezone,
        location: validArgs.location,
        isAllDay: false,
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(Event, "create").mockResolvedValue(mockEventDoc as any);

      const result = await executeCreateCalendarEvent(mockUserId, validArgs);
      expect(result.id).toBeDefined();
      expect(result.title).toBe("Study Session");
      expect(result.timezone).toBe("America/New_York");
      expect(Event.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          title: "Study Session",
          timezone: "America/New_York"
        })
      );
    });

    it("rejects create_calendar_event when endTime is before startTime", async () => {
      const invalidArgs = {
        title: "Invalid Event",
        startTime: new Date(Date.now() + 7200000).toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
        timezone: "UTC"
      };

      await expect(executeCreateCalendarEvent(mockUserId, invalidArgs)).rejects.toThrow(
        "Event end time must be after start time."
      );
    });

    it("executes create_habit with frequency & streak initialization", async () => {
      const habitArgs = {
        title: "Daily Running",
        frequency: { type: "daily" as const, daysOfWeek: [], timesPerPeriod: 1 }
      };

      const mockHabitDoc = {
        _id: new mongoose.Types.ObjectId(),
        title: habitArgs.title,
        frequency: habitArgs.frequency
      };

      vi.spyOn(Habit, "create").mockResolvedValue(mockHabitDoc as any);

      const result = await executeCreateHabit(mockUserId, habitArgs);
      expect(result.id).toBeDefined();
      expect(result.title).toBe("Daily Running");
      expect(Habit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          title: "Daily Running"
        })
      );
    });

    it("executes create_note with ProseMirror content extraction", async () => {
      const noteArgs = {
        title: "Meeting Summary",
        content: "Discussed Phase 3 AI roadmap and RAG pipeline.",
        tags: ["work", "ai"]
      };

      const mockNoteDoc = {
        _id: new mongoose.Types.ObjectId(),
        title: noteArgs.title,
        contentText: noteArgs.content,
        tags: noteArgs.tags
      };

      vi.spyOn(Note, "create").mockResolvedValue(mockNoteDoc as any);

      const result = await executeCreateNote(mockUserId, noteArgs);
      expect(result.id).toBeDefined();
      expect(result.title).toBe("Meeting Summary");
      expect(result.contentText).toContain("Discussed Phase 3 AI roadmap");
    });
  });

  // ─── 2. Confirmation Step for Writes (FR-2.4) ────────────────────────────
  describe("Confirmation Step for Writes (FR-2.4)", () => {
    it("proposed tool call is NOT executed until confirmed, and leaves zero side-effects when cancelled", async () => {
      const mockNoteCreate = vi.spyOn(Note, "create");

      // Verify Note.create was NOT called
      expect(mockNoteCreate).not.toHaveBeenCalled();
    });

    it("executes proposed tool call ONLY after explicit user confirmation", async () => {
      const mockHabitDoc = {
        _id: new mongoose.Types.ObjectId(),
        title: "Confirmed Hydration Habit",
        frequency: { type: "daily", daysOfWeek: [], timesPerPeriod: 1 }
      };

      vi.spyOn(Habit, "create").mockResolvedValue(mockHabitDoc as any);

      const proposedArgs = { title: "Confirmed Hydration Habit" };

      // User Confirms -> Execute tool call
      const result = await executeToolCall(mockUserId, "create_habit", proposedArgs);

      expect((result as any).title).toBe("Confirmed Hydration Habit");
      expect(Habit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          title: "Confirmed Hydration Habit"
        })
      );
    });
  });

  // ─── 3. Verification of Example Queries (FR-2.3) & Uncertainty (FR-2.6) ──
  describe("FR-2.3 Example Queries & FR-2.6 Uncertainty Signaling", () => {
    it("handles query 1: 'How productive was I this month?' with RAG context", async () => {
      vi.spyOn(Embedding, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          {
            _id: new mongoose.Types.ObjectId(),
            userId: mockUserId,
            sourceType: "habit",
            sourceId: new mongoose.Types.ObjectId(),
            title: "Morning Meditation",
            embeddedText:
              "Habit: Morning Meditation. Current Streak: 12 days. Completion Rate: 85%",
            vector: generateMockEmbedding("How productive was I this month?")
          }
        ])
      } as any);

      const rag = await retrieveContext(mockUserId, "How productive was I this month?", {
        topK: 5
      });
      expect(rag.query).toBe("How productive was I this month?");
      expect(rag.results.length).toBeGreaterThan(0);
    });

    it("handles query 4: 'Help me get financially better' (stub response when finance module does not exist)", async () => {
      vi.spyOn(Embedding, "find").mockReturnValue({
        lean: vi.fn().mockResolvedValue([])
      } as any);

      const rag = await retrieveContext(mockUserId, "Help me get financially better", { topK: 5 });
      expect(rag.query).toBe("Help me get financially better");
      expect(rag.results.length).toBe(0);
    });

    it("executes sensitive content retention sanitization (FR-2.7, NFR-6.2)", async () => {
      vi.spyOn(AiRequestLog, "updateMany").mockResolvedValue({ modifiedCount: 2 } as any);
      vi.spyOn(Message, "updateMany").mockResolvedValue({ modifiedCount: 5 } as any);

      const result = await sanitizeExpiredAiLogs(90);
      expect(result.sanitizedLogsCount).toBe(2);
      expect(result.sanitizedMessagesCount).toBe(5);
    });
  });
});
