import { describe, it, expect, vi, beforeEach } from "vitest";
import { Types } from "mongoose";
import { processSyncPush, processSyncPull } from "../../services/sync/syncProcessor.js";
import { Habit } from "../../models/Habit.js";
import { HabitCheckIn } from "../../models/HabitCheckIn.js";
import { Transaction } from "../../models/Transaction.js";
import { Budget } from "../../models/Budget.js";
import { Note } from "../../models/Note.js";
import { NoteFolder } from "../../models/NoteFolder.js";
import { NoteVersion } from "../../models/NoteVersion.js";
import { Event } from "../../models/Event.js";
import { Goal } from "../../models/Goal.js";
import { Category } from "../../models/Category.js";
import { SyncTombstone } from "../../models/SyncTombstone.js";
import * as financeHooks from "../../services/financeHooks.js";
import * as streakModule from "../../services/streak.js";

// Mock AI & Budget side-effect jobs
vi.mock("../../services/ai/embeddingJob.js", () => ({
  enqueueEmbeddingJob: vi.fn().mockResolvedValue({}),
  deleteEmbedding: vi.fn().mockResolvedValue({})
}));

vi.mock("../../services/budgetService.js", () => ({
  recalculateBudgetSpend: vi.fn().mockResolvedValue({})
}));

describe("Sync Processor - Push & Business Logic Reuse", () => {
  const userId = new Types.ObjectId("662c9f1e9f0b2a001c3d4e00").toString();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("applies a batch of creates, updates, and deletes with correct dependency ordering", async () => {
    const folderId = new Types.ObjectId().toString();
    const noteId = new Types.ObjectId().toString();

    const pushChanges: any[] = [
      {
        id: noteId,
        module: "notes",
        operation: "create",
        data: {
          title: "My Offline Note",
          content: { type: "doc", content: [{ type: "paragraph", text: "Hello offline" }] },
          folderId
        },
        lastModifiedAt: Date.now()
      },
      {
        id: folderId,
        module: "note_folders",
        operation: "create",
        data: { name: "Offline Folder" },
        lastModifiedAt: Date.now()
      }
    ];

    // Mock NoteFolder & Note & NoteVersion Mongoose models
    vi.spyOn(NoteFolder, "findOneAndUpdate").mockResolvedValue({
      _id: folderId,
      userId,
      name: "Offline Folder",
      toObject: () => ({ id: folderId, name: "Offline Folder" })
    } as any);

    vi.spyOn(Note, "findOne").mockResolvedValue(null);
    vi.spyOn(Note, "create").mockResolvedValue({
      _id: noteId,
      userId,
      title: "My Offline Note",
      contentText: "Hello offline",
      toObject: () => ({ id: noteId, title: "My Offline Note" })
    } as any);

    vi.spyOn(NoteVersion, "findOne").mockReturnValue({
      sort: vi.fn().mockResolvedValue(null)
    } as any);
    vi.spyOn(NoteVersion, "create").mockResolvedValue({} as any);

    const result = await processSyncPush(userId, pushChanges);

    expect(result.cursor).toBeDefined();
    expect(result.results).toHaveLength(2);
    expect(result.results.every((r) => r.status === "applied")).toBe(true);
  });

  it("synced habit check-in triggers streak calculation & habit stats update", async () => {
    const habitId = new Types.ObjectId().toString();
    const checkInId = new Types.ObjectId().toString();

    const mockHabit = {
      _id: habitId,
      userId,
      frequency: { type: "daily", daysOfWeek: [], timesPerPeriod: 1 },
      longestStreak: 2,
      currentStreak: 0,
      completionRate: 0,
      lastCheckInDate: null,
      save: vi.fn().mockResolvedValue(true)
    };

    vi.spyOn(Habit, "findOne").mockResolvedValue(mockHabit as any);
    vi.spyOn(HabitCheckIn, "findOneAndUpdate").mockResolvedValue({
      _id: checkInId,
      habitId,
      date: "2026-08-16",
      completed: true,
      toObject: () => ({ id: checkInId, date: "2026-08-16", completed: true })
    } as any);

    vi.spyOn(HabitCheckIn, "find").mockReturnValue({
      select: vi.fn().mockResolvedValue([
        { date: "2026-08-15", completed: true },
        { date: "2026-08-16", completed: true }
      ])
    } as any);

    const calcStatsSpy = vi.spyOn(streakModule, "calculateHabitStats");

    const pushChanges: any[] = [
      {
        id: checkInId,
        module: "habit_check_ins",
        operation: "create",
        data: {
          habitId,
          date: "2026-08-16",
          completed: true
        },
        lastModifiedAt: Date.now()
      }
    ];

    const result = await processSyncPush(userId, pushChanges);

    expect(result.results[0].status).toBe("applied");
    expect(calcStatsSpy).toHaveBeenCalled();
    expect(mockHabit.save).toHaveBeenCalled();
  });

  it("synced transaction triggers onTransactionCreated and budget recalculation", async () => {
    const transactionId = new Types.ObjectId().toString();
    const onCreatedSpy = vi.spyOn(financeHooks, "onTransactionCreated");

    vi.spyOn(Category, "findOneAndUpdate").mockResolvedValue({} as any);
    vi.spyOn(Transaction, "findOne").mockResolvedValue(null);
    vi.spyOn(Transaction, "create").mockResolvedValue({
      _id: transactionId,
      userId,
      amount: 75.5,
      type: "expense",
      category: "Groceries",
      date: new Date("2026-08-16"),
      toObject: () => ({ id: transactionId, amount: 75.5 })
    } as any);

    const pushChanges: any[] = [
      {
        id: transactionId,
        module: "transactions",
        operation: "create",
        data: {
          amount: 75.5,
          type: "expense",
          category: "Groceries",
          date: "2026-08-16T10:00:00.000Z"
        },
        lastModifiedAt: Date.now()
      }
    ];

    const result = await processSyncPush(userId, pushChanges);

    expect(result.results[0].status).toBe("applied");
    expect(onCreatedSpy).toHaveBeenCalledTimes(1);
  });

  it("records tombstone on entity deletion", async () => {
    const eventId = new Types.ObjectId().toString();
    const tombstoneSpy = vi.spyOn(SyncTombstone, "findOneAndUpdate").mockResolvedValue({} as any);
    vi.spyOn(Event, "findOneAndDelete").mockResolvedValue({ _id: eventId } as any);

    const pushChanges: any[] = [
      {
        id: eventId,
        module: "events",
        operation: "delete",
        lastModifiedAt: Date.now()
      }
    ];

    const result = await processSyncPush(userId, pushChanges);

    expect(result.results[0].status).toBe("applied");
    expect(tombstoneSpy).toHaveBeenCalledWith(
      expect.objectContaining({ entityId: eventId, module: "events" }),
      expect.anything(),
      expect.anything()
    );
  });
});

describe("Sync Processor - Pull Changes & Tombstones", () => {
  const userId = new Types.ObjectId("662c9f1e9f0b2a001c3d4e00").toString();

  it("returns modified documents and deleted entity IDs since cursor", async () => {
    const cursor = "2026-08-15T00:00:00.000Z";

    vi.spyOn(Habit, "find").mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        {
          _id: new Types.ObjectId("662c9f1e9f0b2a001c3d4e01"),
          userId,
          title: "Drink water",
          updatedAt: new Date("2026-08-16T08:00:00.000Z")
        }
      ])
    } as any);

    vi.spyOn(Event, "find").mockReturnValue({ lean: vi.fn().mockResolvedValue([]) } as any);
    vi.spyOn(Goal, "find").mockReturnValue({ lean: vi.fn().mockResolvedValue([]) } as any);
    vi.spyOn(HabitCheckIn, "find").mockReturnValue({ lean: vi.fn().mockResolvedValue([]) } as any);
    vi.spyOn(Note, "find").mockReturnValue({ lean: vi.fn().mockResolvedValue([]) } as any);
    vi.spyOn(NoteFolder, "find").mockReturnValue({ lean: vi.fn().mockResolvedValue([]) } as any);
    vi.spyOn(Transaction, "find").mockReturnValue({ lean: vi.fn().mockResolvedValue([]) } as any);
    vi.spyOn(Budget, "find").mockReturnValue({ lean: vi.fn().mockResolvedValue([]) } as any);
    vi.spyOn(Category, "find").mockReturnValue({ lean: vi.fn().mockResolvedValue([]) } as any);
    vi.spyOn(NoteVersion, "find").mockReturnValue({ lean: vi.fn().mockResolvedValue([]) } as any);

    vi.spyOn(SyncTombstone, "find").mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        {
          userId,
          module: "notes",
          entityId: "deleted-note-123",
          deletedAt: new Date("2026-08-16T09:00:00.000Z")
        }
      ])
    } as any);

    const pullResult = await processSyncPull(userId, cursor);

    expect(pullResult.cursor).toBeDefined();
    expect(pullResult.changes.habits?.upserted).toHaveLength(1);
    expect(pullResult.changes.habits?.upserted[0].title).toBe("Drink water");
    expect(pullResult.changes.notes?.deleted).toContain("deleted-note-123");
  });
});
