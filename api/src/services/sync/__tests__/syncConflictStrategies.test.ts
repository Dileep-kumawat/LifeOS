import { describe, it, expect, vi, beforeEach } from "vitest";
import { Types } from "mongoose";
import {
  processSyncPush,
  resolveSyncConflict
} from "../syncProcessor.js";
import { Habit } from "../../../models/Habit.js";
import { HabitCheckIn } from "../../../models/HabitCheckIn.js";
import { Transaction } from "../../../models/Transaction.js";
import { Budget } from "../../../models/Budget.js";
import { Note } from "../../../models/Note.js";
import { NoteVersion } from "../../../models/NoteVersion.js";
import { Event } from "../../../models/Event.js";
import { Category } from "../../../models/Category.js";
import * as streakModule from "../../streak.js";
import * as financeHooks from "../../financeHooks.js";

// Mock AI & Budget side-effects
vi.mock("../../ai/embeddingJob.js", () => ({
  enqueueEmbeddingJob: vi.fn().mockResolvedValue({}),
  deleteEmbedding: vi.fn().mockResolvedValue({})
}));

vi.mock("../../budgetService.js", () => ({
  recalculateBudgetSpend: vi.fn().mockResolvedValue({})
}));

describe("Per-Module Sync Conflict Resolution Strategies", () => {
  const userId = new Types.ObjectId("662c9f1e9f0b2a001c3d4e00").toString();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Strategy 1: Notes Field-Level Auto-Merge & True Conflict Surfacing", () => {
    const noteId = new Types.ObjectId().toString();

    it("cleanly merges non-conflicting fields (Device A changed title, Device B changed content) without conflict", async () => {
      const serverEditTime = 2000000;
      const clientEditTime = 1500000; // Client edited based on base time, before serverEditTime

      const baseNoteDoc = {
        _id: noteId,
        userId,
        versionNumber: 1,
        title: "Original Title",
        content: { type: "doc", content: [{ type: "text", text: "Original Content" }] },
        contentText: "Original Content",
        folderId: null,
        tags: []
      };

      // Server already has Device B's edit to content
      const existingServerNote = {
        _id: noteId,
        userId,
        title: "Original Title", // Server kept original title
        content: { type: "doc", content: [{ type: "text", text: "Device B Edited Content" }] },
        contentText: "Device B Edited Content",
        folderId: null,
        tags: [],
        updatedAt: new Date(serverEditTime),
        save: vi.fn().mockImplementation(function (this: any) {
          return Promise.resolve(this);
        }),
        toObject: function () {
          return { ...this };
        }
      };

      vi.spyOn(Note, "findOne").mockResolvedValue(existingServerNote as any);
      vi.spyOn(NoteVersion, "findOne").mockImplementation((query: any) => {
        if (query.createdAt) {
          // Base version lookup
          return {
            sort: vi.fn().mockResolvedValue(baseNoteDoc)
          } as any;
        }
        // Latest version lookup
        return {
          sort: vi.fn().mockResolvedValue({ versionNumber: 2 })
        } as any;
      });

      const noteVersionCreateSpy = vi.spyOn(NoteVersion, "create").mockResolvedValue({} as any);

      // Device A pushes an edit that ONLY modified the title
      const pushChanges: any[] = [
        {
          id: noteId,
          module: "notes",
          operation: "update",
          data: {
            title: "Device A Clean Title Edit",
            content: baseNoteDoc.content,
            contentText: baseNoteDoc.contentText,
            folderId: null,
            tags: []
          },
          lastModifiedAt: clientEditTime
        }
      ];

      const result = await processSyncPush(userId, pushChanges);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].status).toBe("applied");
      expect(result.results[0].serverRecord?.title).toBe("Device A Clean Title Edit");
      expect(result.results[0].serverRecord?.contentText).toBe("Device B Edited Content");

      // Verify NoteVersion incremented with changeSource: "sync"
      expect(noteVersionCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          versionNumber: 3,
          title: "Device A Clean Title Edit",
          contentText: "Device B Edited Content",
          changeSource: "sync"
        })
      );
    });

    it("surfaces a true conflict when both devices edited the SAME field (content), preserving both in NoteVersion", async () => {
      const serverEditTime = 2000000;
      const clientEditTime = 1500000;

      const baseNoteDoc = {
        _id: noteId,
        userId,
        versionNumber: 1,
        title: "Base Title",
        content: { type: "doc", content: [{ type: "text", text: "Base Content" }] },
        contentText: "Base Content",
        folderId: null,
        tags: []
      };

      // Server was edited to "Server Content Edit"
      const existingServerNote = {
        _id: noteId,
        userId,
        title: "Base Title",
        content: { type: "doc", content: [{ type: "text", text: "Server Content Edit" }] },
        contentText: "Server Content Edit",
        folderId: null,
        tags: [],
        updatedAt: new Date(serverEditTime),
        toObject: function () {
          return { ...this };
        }
      };

      vi.spyOn(Note, "findOne").mockResolvedValue(existingServerNote as any);
      vi.spyOn(NoteVersion, "findOne").mockImplementation((query: any) => {
        if (query.createdAt) {
          return { sort: vi.fn().mockResolvedValue(baseNoteDoc) } as any;
        }
        return { sort: vi.fn().mockResolvedValue({ versionNumber: 2 }) } as any;
      });

      const noteVersionCreateSpy = vi.spyOn(NoteVersion, "create").mockResolvedValue({} as any);

      // Client also edited content differently to "Client Content Edit"
      const pushChanges: any[] = [
        {
          id: noteId,
          module: "notes",
          operation: "update",
          data: {
            title: "Base Title",
            content: { type: "doc", content: [{ type: "text", text: "Client Content Edit" }] },
            contentText: "Client Content Edit",
            folderId: null,
            tags: []
          },
          lastModifiedAt: clientEditTime
        }
      ];

      const result = await processSyncPush(userId, pushChanges);

      expect(result.results).toHaveLength(1);
      expect(result.results[0].status).toBe("conflict");
      expect(result.results[0].conflictingFields).toContain("content");
      expect(result.results[0].conflictData?.clientRecord.contentText).toBe("Client Content Edit");
      expect(result.results[0].conflictData?.serverRecord.contentText).toBe("Server Content Edit");

      // Verify both versions were preserved by recording incoming conflict in NoteVersion
      expect(noteVersionCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          versionNumber: 3,
          contentText: "Client Content Edit",
          changeSource: "conflict_merge"
        })
      );
    });

    it("resolves a note conflict explicitly via resolveSyncConflict", async () => {
      const mockNote = {
        _id: noteId,
        userId,
        title: "Old Title",
        contentText: "Old Text",
        save: vi.fn().mockImplementation(function (this: any) {
          return Promise.resolve(this);
        }),
        toObject: function () {
          return { id: noteId, title: this.title, contentText: this.contentText };
        }
      };

      vi.spyOn(Note, "findOne").mockResolvedValue(mockNote as any);
      vi.spyOn(NoteVersion, "findOne").mockReturnValue({
        sort: vi.fn().mockResolvedValue({ versionNumber: 3 })
      } as any);
      const versionCreateSpy = vi.spyOn(NoteVersion, "create").mockResolvedValue({} as any);

      const resolvedResult = await resolveSyncConflict(
        userId,
        noteId,
        "notes",
        "manual_merge",
        {
          title: "Merged Title",
          contentText: "Merged Content from both devices",
          content: { type: "doc", content: [] }
        }
      );

      expect(resolvedResult.status).toBe("applied");
      expect(mockNote.title).toBe("Merged Title");
      expect(mockNote.contentText).toBe("Merged Content from both devices");
      expect(versionCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          versionNumber: 4,
          changeSource: "conflict_merge"
        })
      );
    });
  });

  describe("Strategy 2: Finance & Habits Structural Conflict Avoidance", () => {
    it("deduplicates habit check-ins idempotently for same habit+date with boolean LWW without conflict", async () => {
      const habitId = new Types.ObjectId().toString();
      const checkInId = new Types.ObjectId().toString();
      const calcStatsSpy = vi.spyOn(streakModule, "calculateHabitStats");

      vi.spyOn(Habit, "findOne").mockResolvedValue({
        _id: habitId,
        userId,
        frequency: { type: "daily", daysOfWeek: [], timesPerPeriod: 1 },
        longestStreak: 5,
        save: vi.fn().mockResolvedValue(true)
      } as any);

      vi.spyOn(HabitCheckIn, "find").mockReturnValue({
        select: vi.fn().mockResolvedValue([{ date: "2026-08-16", completed: true }])
      } as any);

      const upsertSpy = vi.spyOn(HabitCheckIn, "findOneAndUpdate").mockResolvedValue({
        _id: checkInId,
        habitId,
        date: "2026-08-16",
        completed: true,
        toObject: () => ({ id: checkInId, date: "2026-08-16", completed: true })
      } as any);

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
      expect(upsertSpy).toHaveBeenCalledWith(
        expect.objectContaining({ habitId: expect.any(Types.ObjectId), date: "2026-08-16" }),
        expect.anything(),
        expect.objectContaining({ upsert: true })
      );
      expect(calcStatsSpy).toHaveBeenCalled();
    });

    it("surfaces true field-level conflict on concurrent Transaction edit without silent discard", async () => {
      const txId = new Types.ObjectId().toString();
      const serverUpdatedTime = 2000000;
      const clientLastModified = 1500000;

      const existingServerTx = {
        _id: txId,
        userId,
        amount: 50.0, // Device B changed amount to 50
        type: "expense",
        category: "Groceries",
        date: new Date("2026-08-16"),
        note: "Server Note",
        updatedAt: new Date(serverUpdatedTime),
        toObject: function () {
          return { ...this };
        }
      };

      vi.spyOn(Category, "findOneAndUpdate").mockResolvedValue({} as any);
      vi.spyOn(Transaction, "findOne").mockResolvedValue(existingServerTx as any);

      // Device A concurrently edited amount to 75
      const pushChanges: any[] = [
        {
          id: txId,
          module: "transactions",
          operation: "update",
          data: {
            amount: 75.0,
            type: "expense",
            category: "Groceries",
            date: "2026-08-16",
            note: "Server Note"
          },
          lastModifiedAt: clientLastModified
        }
      ];

      const result = await processSyncPush(userId, pushChanges);

      expect(result.results[0].status).toBe("conflict");
      expect(result.results[0].conflictingFields).toContain("amount");
      expect(result.results[0].conflictData?.clientRecord.amount).toBe(75.0);
      expect(result.results[0].conflictData?.serverRecord.amount).toBe(50.0);
    });

    it("cleanly merges non-conflicting disjoint transaction fields (e.g. note changed on Device A, category on Device B)", async () => {
      const txId = new Types.ObjectId().toString();
      const serverUpdatedTime = 2000000;
      const clientLastModified = 1500000;

      const existingServerTx = {
        _id: txId,
        userId,
        amount: 25.0,
        type: "expense",
        category: "Dining", // Device B updated category to Dining
        date: new Date("2026-08-16"),
        note: "Original Note",
        updatedAt: new Date(serverUpdatedTime),
        save: vi.fn().mockImplementation(function (this: any) {
          return Promise.resolve(this);
        }),
        toObject: function () {
          return { ...this };
        }
      };

      vi.spyOn(Category, "findOneAndUpdate").mockResolvedValue({} as any);
      vi.spyOn(Transaction, "findOne").mockResolvedValue(existingServerTx as any);
      const updateHookSpy = vi.spyOn(financeHooks, "onTransactionUpdated").mockResolvedValue({} as any);

      // Device A changed note to "Lunch with team" while keeping base category General
      const pushChanges: any[] = [
        {
          id: txId,
          module: "transactions",
          operation: "update",
          data: {
            amount: 25.0,
            type: "expense",
            category: "General",
            date: "2026-08-16",
            note: "Lunch with team",
            baseRecord: {
              amount: 25.0,
              type: "expense",
              category: "General",
              date: "2026-08-16",
              note: "Original Note"
            }
          },
          lastModifiedAt: clientLastModified
        }
      ];

      const result = await processSyncPush(userId, pushChanges);

      expect(result.results[0].status).toBe("applied");
      expect(result.results[0].serverRecord?.category).toBe("Dining");
      expect(result.results[0].serverRecord?.note).toBe("Lunch with team");
      expect(updateHookSpy).toHaveBeenCalled();
    });

    it("surfaces true field-level conflict on Budget edits when limits differ", async () => {
      const budgetId = new Types.ObjectId().toString();
      const serverUpdatedTime = 2000000;
      const clientLastModified = 1500000;

      const existingBudget = {
        _id: budgetId,
        userId,
        category: "Entertainment",
        limit: 300,
        period: "monthly",
        currentSpend: 50,
        notifiedOverspend: false,
        updatedAt: new Date(serverUpdatedTime),
        toObject: function () {
          return { ...this };
        }
      };

      vi.spyOn(Budget, "findOne").mockResolvedValue(existingBudget as any);

      // Device A modified limit to 500
      const pushChanges: any[] = [
        {
          id: budgetId,
          module: "budgets",
          operation: "update",
          data: {
            category: "Entertainment",
            limit: 500,
            period: "monthly"
          },
          lastModifiedAt: clientLastModified
        }
      ];

      const result = await processSyncPush(userId, pushChanges);

      expect(result.results[0].status).toBe("conflict");
      expect(result.results[0].conflictingFields).toContain("limit");
    });
  });

  describe("Strategy 3: Calendar LWW with User Flag Notification", () => {
    it("applies server-side LWW on Calendar event concurrent edit and returns a lightweight conflict notice", async () => {
      const eventId = new Types.ObjectId().toString();
      const serverUpdatedTime = 2000000;
      const clientLastModified = 1500000;

      const existingServerEvent = {
        _id: eventId,
        userId,
        title: "Sprint Planning on Server",
        startTime: new Date("2026-08-16T10:00:00.000Z"),
        endTime: new Date("2026-08-16T11:00:00.000Z"),
        location: "Room 101",
        description: "Server description",
        updatedAt: new Date(serverUpdatedTime),
        save: vi.fn().mockImplementation(function (this: any) {
          return Promise.resolve(this);
        }),
        toObject: function () {
          return { ...this };
        }
      };

      vi.spyOn(Event, "findOne").mockResolvedValue(existingServerEvent as any);

      // Device A concurrently edited event title to "Sprint Planning - Local"
      const pushChanges: any[] = [
        {
          id: eventId,
          module: "events",
          operation: "update",
          data: {
            title: "Sprint Planning - Local",
            startTime: "2026-08-16T10:00:00.000Z",
            endTime: "2026-08-16T11:00:00.000Z",
            location: "Room 101",
            description: "Server description"
          },
          lastModifiedAt: clientLastModified
        }
      ];

      const result = await processSyncPush(userId, pushChanges);

      // Status is applied (LWW) but with conflictNotice flag for the client
      expect(result.results[0].status).toBe("applied");
      expect(result.results[0].conflictNotice).toBe(
        "This event was updated on another device and your local change was overwritten"
      );
      expect(result.results[0].serverRecord?.title).toBe("Sprint Planning - Local");
    });
  });

  describe("Strategy for Habit Metadata & Field Conflict Handling", () => {
    it("merges disjoint habit metadata edits cleanly (Device A changed reminderTime, Device B changed title)", async () => {
      const habitId = new Types.ObjectId().toString();
      const serverUpdatedTime = 2000000;
      const clientLastModified = 1500000;

      const existingHabit = {
        _id: habitId,
        userId,
        title: "Read 20 mins daily (Server Edit)",
        reminderTime: "08:00",
        reminderEnabled: true,
        frequency: { type: "daily", daysOfWeek: [], timesPerPeriod: 1 },
        updatedAt: new Date(serverUpdatedTime),
        save: vi.fn().mockImplementation(function (this: any) {
          return Promise.resolve(this);
        }),
        toObject: function () {
          return { ...this };
        }
      };

      vi.spyOn(Habit, "findOne").mockResolvedValue(existingHabit as any);

      // Device A changed reminderTime to 09:00 with base title
      const pushChanges: any[] = [
        {
          id: habitId,
          module: "habits",
          operation: "update",
          data: {
            title: "Read 20 mins daily",
            reminderTime: "09:00",
            reminderEnabled: true,
            frequency: { type: "daily", daysOfWeek: [], timesPerPeriod: 1 },
            baseRecord: {
              title: "Read 20 mins daily",
              reminderTime: "08:00",
              reminderEnabled: true,
              frequency: { type: "daily", daysOfWeek: [], timesPerPeriod: 1 }
            }
          },
          lastModifiedAt: clientLastModified
        }
      ];

      const result = await processSyncPush(userId, pushChanges);

      expect(result.results[0].status).toBe("applied");
      expect(result.results[0].serverRecord?.title).toBe("Read 20 mins daily (Server Edit)");
      expect(result.results[0].serverRecord?.reminderTime).toBe("09:00");
    });
  });
});
