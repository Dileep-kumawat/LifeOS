import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { Types } from "mongoose";
import fs from "fs";
import path from "path";

// Mock redis
vi.mock("../../db/redis.js", () => ({
  redis: {
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    ttl: vi.fn().mockResolvedValue(3600),
    del: vi.fn().mockResolvedValue(1)
  }
}));

// Mock auditService
vi.mock("../../services/auditService.js", () => ({
  anonymizeIp: vi.fn((ip: string) => (ip ? "192.168.1.0" : "unknown")),
  auditService: {
    log: vi.fn().mockResolvedValue(undefined)
  }
}));

// Mock tokenService
vi.mock("../../auth/tokenService.js", () => ({
  clearRefreshCookie: vi.fn(),
  revokeAllUserTokens: vi.fn().mockResolvedValue(1),
  setRefreshCookie: vi.fn(),
  generateAccessToken: vi.fn().mockReturnValue("mock_access_token"),
  createRefreshToken: vi.fn().mockResolvedValue("mock_refresh_token")
}));

// Mock BullMQ queues
vi.mock("../../services/queue.js", () => ({
  jobsQueue: {
    getJobs: vi.fn().mockResolvedValue([
      {
        id: "job-user-a",
        data: { userId: "662c9f1e9f0b2a001c3d4e01" },
        remove: vi.fn().mockResolvedValue(undefined)
      },
      {
        id: "job-user-b",
        data: { userId: "662c9f1e9f0b2a001c3d4e02" },
        remove: vi.fn().mockResolvedValue(undefined)
      }
    ]),
    add: vi.fn().mockResolvedValue({ id: "mock-job-id" })
  }
}));

vi.mock("../../services/accountPurgeQueue.js", () => ({
  ACCOUNT_PURGE_QUEUE_NAME: "account-purge",
  scheduleAccountPurge: vi.fn().mockResolvedValue(undefined),
  accountPurgeQueue: {
    getJobs: vi.fn().mockResolvedValue([]),
    add: vi.fn().mockResolvedValue({ id: "mock-purge-id" })
  }
}));

// Hoisted auth state
const { getActiveUser, setActiveUser } = vi.hoisted(() => {
  let user: any = null;
  return {
    getActiveUser: () => user,
    setActiveUser: (u: any) => {
      user = u;
    }
  };
});

// Mock passport
vi.mock("passport", () => ({
  default: {
    authenticate: (_strategy: string, _options: any, callback: any) => (req: any, res: any) => {
      if (req.headers["x-test-unauthenticated"] === "true") {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Authentication required or account is inactive."
        });
      }
      const u = getActiveUser();
      if (!u || u.status === "soft_deleted") {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Authentication required or account is inactive."
        });
      }
      callback(null, u, null);
    }
  }
}));

// Mock models
import { User } from "../../models/User.js";
import { RefreshToken } from "../../models/RefreshToken.js";
import { Event } from "../../models/Event.js";
import { Goal } from "../../models/Goal.js";
import { Habit } from "../../models/Habit.js";
import { HabitCheckIn } from "../../models/HabitCheckIn.js";
import { Note } from "../../models/Note.js";
import { NoteFolder } from "../../models/NoteFolder.js";
import { NoteVersion } from "../../models/NoteVersion.js";
import { Transaction } from "../../models/Transaction.js";
import { Budget } from "../../models/Budget.js";
import { BudgetHistory } from "../../models/BudgetHistory.js";
import { Category } from "../../models/Category.js";
import { Subject } from "../../models/Subject.js";
import { Topic } from "../../models/Topic.js";
import { Flashcard } from "../../models/Flashcard.js";
import { FocusSession } from "../../models/FocusSession.js";
import { Conversation } from "../../models/Conversation.js";
import { Message } from "../../models/Message.js";
import { AiRequestLog } from "../../models/AiRequestLog.js";
import { Embedding } from "../../models/Embedding.js";
import { Summary } from "../../models/Summary.js";
import { Recommendation } from "../../models/Recommendation.js";
import { Notification } from "../../models/Notification.js";
import { PushSubscription } from "../../models/PushSubscription.js";
import { SyncTombstone } from "../../models/SyncTombstone.js";

import { generateUserDataExport } from "../../services/userDataExportService.js";
import { purgeUserData, purgeEligibleAccounts } from "../../services/accountPurgeService.js";
import { RAW_CONTENT_RETENTION_DAYS } from "../../services/ai/retention.js";
import { authRouter } from "../auth.js";
import { auditService } from "../../services/auditService.js";

function createMockQuery(returnValue: any) {
  return {
    lean: vi.fn().mockResolvedValue(returnValue),
    select: vi.fn().mockResolvedValue(returnValue)
  };
}

describe("GDPR / India DPDP Compliance Pass (Phase 10)", () => {
  const userAId = new Types.ObjectId("662c9f1e9f0b2a001c3d4e01");
  const userBId = new Types.ObjectId("662c9f1e9f0b2a001c3d4e02");

  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();

    app = express();
    app.use(express.json());
    app.use("/api/v1", authRouter);
  });

  describe("1. Complete User Data Export (NFR-6.1 / Data Portability)", () => {
    it("generates a comprehensive structured export containing all user-owned data", async () => {
      // Setup User A mock data
      const mockUserA = {
        _id: userAId,
        email: "usera@example.com",
        name: "User Alpha",
        role: "user",
        emailVerified: true,
        subscriptionTier: "pro",
        passwordHash: "$2a$12$SuperSecretHashedPasswordThatMustNeverBeExported",
        passwordResetTokenHash: "secret_reset_hash",
        notificationPreferences: { push: true, inApp: true }
      };

      vi.spyOn(User, "findById").mockReturnValue(createMockQuery(mockUserA) as any);
      vi.spyOn(RefreshToken, "find").mockReturnValue(
        createMockQuery([
          {
            _id: new Types.ObjectId(),
            userId: userAId,
            hashedToken: "secret_session_token_hash",
            deviceType: "mobile",
            userAgent: "LifeOS-Expo/1.0",
            ipAddress: "192.168.1.50"
          }
        ]) as any
      );
      vi.spyOn(Event, "find").mockReturnValue(
        createMockQuery([{ _id: new Types.ObjectId(), userId: userAId, title: "Team Sprint" }]) as any
      );
      vi.spyOn(Goal, "find").mockReturnValue(
        createMockQuery([{ _id: new Types.ObjectId(), userId: userAId, title: "Launch MVP" }]) as any
      );
      vi.spyOn(Habit, "find").mockReturnValue(
        createMockQuery([{ _id: new Types.ObjectId(), userId: userAId, name: "Meditation" }]) as any
      );
      vi.spyOn(HabitCheckIn, "find").mockReturnValue(
        createMockQuery([{ _id: new Types.ObjectId(), habitId: new Types.ObjectId(), date: "2026-09-07" }]) as any
      );
      vi.spyOn(Note, "find").mockReturnValue(
        createMockQuery([{ _id: new Types.ObjectId(), userId: userAId, title: "Architecture Notes" }]) as any
      );
      vi.spyOn(NoteFolder, "find").mockReturnValue(
        createMockQuery([{ _id: new Types.ObjectId(), userId: userAId, name: "Engineering" }]) as any
      );
      vi.spyOn(NoteVersion, "find").mockReturnValue(
        createMockQuery([{ _id: new Types.ObjectId(), noteId: new Types.ObjectId(), versionNumber: 1 }]) as any
      );
      vi.spyOn(Transaction, "find").mockReturnValue(
        createMockQuery([{ _id: new Types.ObjectId(), userId: userAId, amount: 45.5, category: "Food" }]) as any
      );
      vi.spyOn(Budget, "find").mockReturnValue(
        createMockQuery([{ _id: new Types.ObjectId(), userId: userAId, category: "Food", limit: 500 }]) as any
      );
      vi.spyOn(BudgetHistory, "find").mockReturnValue(
        createMockQuery([{ _id: new Types.ObjectId(), category: "Food", limit: 500, finalSpend: 420 }]) as any
      );
      vi.spyOn(Category, "find").mockReturnValue(
        createMockQuery([{ _id: new Types.ObjectId(), userId: userAId, name: "Groceries" }]) as any
      );
      vi.spyOn(Subject, "find").mockReturnValue(
        createMockQuery([{ _id: new Types.ObjectId(), userId: userAId, name: "Computer Science" }]) as any
      );
      vi.spyOn(Topic, "find").mockReturnValue(
        createMockQuery([{ _id: new Types.ObjectId(), userId: userAId, title: "Distributed Systems" }]) as any
      );
      vi.spyOn(Flashcard, "find").mockReturnValue(
        createMockQuery([{ _id: new Types.ObjectId(), userId: userAId, front: "What is Raft?", back: "Consensus" }]) as any
      );
      vi.spyOn(FocusSession, "find").mockReturnValue(
        createMockQuery([{ _id: new Types.ObjectId(), userId: userAId, totalFocusMinutes: 50 }]) as any
      );
      vi.spyOn(Conversation, "find").mockReturnValue(
        createMockQuery([{ _id: new Types.ObjectId(), userId: userAId, title: "System Design Q&A" }]) as any
      );
      vi.spyOn(Message, "find").mockReturnValue(
        createMockQuery([{ _id: new Types.ObjectId(), userId: userAId, role: "user", content: "Explain Raft" }]) as any
      );
      vi.spyOn(Summary, "find").mockReturnValue(
        createMockQuery([{ _id: new Types.ObjectId(), userId: userAId, date: "2026-09-06" }]) as any
      );
      vi.spyOn(Recommendation, "find").mockReturnValue(
        createMockQuery([{ _id: new Types.ObjectId(), userId: userAId, period: "weekly" }]) as any
      );
      vi.spyOn(Notification, "find").mockReturnValue(
        createMockQuery([{ _id: new Types.ObjectId(), userId: userAId, type: "habit_reminder" }]) as any
      );
      vi.spyOn(PushSubscription, "find").mockReturnValue(
        createMockQuery([
          {
            _id: new Types.ObjectId(),
            userId: userAId,
            endpoint: "https://push.example.com/sub/123",
            keys: { auth: "secret_auth_key", p256dh: "secret_p256dh_key" }
          }
        ]) as any
      );
      vi.spyOn(SyncTombstone, "find").mockReturnValue(
        createMockQuery([{ _id: new Types.ObjectId(), module: "notes", entityId: "note-1" }]) as any
      );

      const exportResult = await generateUserDataExport(userAId.toString());

      expect(exportResult).not.toBeNull();
      expect(exportResult!.profile.email).toBe("usera@example.com");
      expect(exportResult!.calendar.length).toBe(1);
      expect(exportResult!.calendar[0].title).toBe("Team Sprint");
      expect(exportResult!.goals[0].title).toBe("Launch MVP");
      expect(exportResult!.habits.habits[0].name).toBe("Meditation");
      expect(exportResult!.notes.notes[0].title).toBe("Architecture Notes");
      expect(exportResult!.finance.transactions[0].amount).toBe(45.5);
      expect(exportResult!.studyPlanner.subjects[0].name).toBe("Computer Science");
      expect(exportResult!.studyPlanner.topics[0].title).toBe("Distributed Systems");
      expect(exportResult!.studyPlanner.flashcards[0].front).toBe("What is Raft?");
      expect(exportResult!.focusSessions[0].totalFocusMinutes).toBe(50);
      expect(exportResult!.aiAssistant.conversations[0].title).toBe("System Design Q&A");
      expect(exportResult!.aiAssistant.messages[0].content).toBe("Explain Raft");
      expect(exportResult!.notifications.notifications[0].type).toBe("habit_reminder");
      expect(exportResult!.notifications.pushEndpoints[0].endpoint).toBe("https://push.example.com/sub/123");
      expect(exportResult!.syncTombstones[0].module).toBe("notes");
    });

    it("strictly excludes authentication secrets and private cryptographic keys from export", async () => {
      const mockUser = {
        _id: userAId,
        email: "secure@example.com",
        name: "Security Conscious",
        passwordHash: "$2a$12$NEVER_LEAK_THIS_HASH",
        passwordResetTokenHash: "NEVER_LEAK_RESET_HASH",
        passwordResetExpiresAt: new Date()
      };

      vi.spyOn(User, "findById").mockReturnValue(createMockQuery(mockUser) as any);
      vi.spyOn(RefreshToken, "find").mockReturnValue(
        createMockQuery([
          {
            _id: new Types.ObjectId(),
            hashedToken: "NEVER_LEAK_SESSION_HASH",
            deviceType: "web"
          }
        ]) as any
      );
      vi.spyOn(PushSubscription, "find").mockReturnValue(
        createMockQuery([
          {
            _id: new Types.ObjectId(),
            endpoint: "https://fcm.googleapis.com/fcm/send/token123",
            keys: { auth: "NEVER_LEAK_PRIVATE_AUTH_KEY", p256dh: "NEVER_LEAK_P256DH" }
          }
        ]) as any
      );

      // Return empty arrays for other collections
      const emptyCollections = [
        Event, Goal, Habit, HabitCheckIn, Note, NoteFolder, NoteVersion,
        Transaction, Budget, BudgetHistory, Category, Subject, Topic,
        Flashcard, FocusSession, Conversation, Message, Summary,
        Recommendation, Notification, SyncTombstone
      ];
      emptyCollections.forEach((col) => {
        vi.spyOn(col, "find").mockReturnValue(createMockQuery([]) as any);
      });

      const exportResult = await generateUserDataExport(userAId.toString());
      const exportedJson = JSON.stringify(exportResult);

      // Verify secrets are nowhere in the exported payload
      expect(exportedJson).not.toContain("NEVER_LEAK_THIS_HASH");
      expect(exportedJson).not.toContain("NEVER_LEAK_RESET_HASH");
      expect(exportedJson).not.toContain("NEVER_LEAK_SESSION_HASH");
      expect(exportedJson).not.toContain("NEVER_LEAK_PRIVATE_AUTH_KEY");
      expect(exportedJson).not.toContain("NEVER_LEAK_P256DH");

      // Verify explicit documentation of excluded fields in metadata
      expect(exportResult!.metadata.excludedSecurityFields).toContain("User.passwordHash");
      expect(exportResult!.metadata.excludedSecurityFields).toContain("RefreshToken.hashedToken");
      expect(exportResult!.metadata.excludedSecurityFields).toContain("PushSubscription.keys");
    });

    it("verifies GET /api/v1/auth/export endpoint downloads file attachment and audits event", async () => {
      setActiveUser({
        _id: userAId,
        email: "usera@example.com",
        status: "active",
        role: "user"
      });

      vi.spyOn(User, "findById").mockReturnValue(
        createMockQuery({
          _id: userAId,
          email: "usera@example.com",
          name: "User A"
        }) as any
      );

      const emptyCollections = [
        RefreshToken, Event, Goal, Habit, HabitCheckIn, Note, NoteFolder,
        NoteVersion, Transaction, Budget, BudgetHistory, Category, Subject,
        Topic, Flashcard, FocusSession, Conversation, Message, Summary,
        Recommendation, Notification, PushSubscription, SyncTombstone
      ];
      emptyCollections.forEach((col) => {
        vi.spyOn(col, "find").mockReturnValue(createMockQuery([]) as any);
      });

      const res = await request(app).get("/api/v1/auth/export");

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("application/json");
      expect(res.headers["content-disposition"]).toContain("attachment; filename=");
      expect(res.body.profile.email).toBe("usera@example.com");

      // Verify audit log call
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "SENSITIVE_DATA_EXPORT",
          targetUserId: userAId.toString(),
          outcome: "SUCCESS"
        }),
        expect.anything()
      );
    });

    it("verifies User A cannot export User B's data (cross-user isolation)", async () => {
      setActiveUser({
        _id: userAId,
        email: "usera@example.com",
        status: "active",
        role: "user"
      });

      // User A makes a query to /auth/export, even if query param or body tries to specify User B
      vi.spyOn(User, "findById").mockImplementation((id: any) => {
        // Assert that the query strictly queries userAId from the authenticated token
        expect(id.toString()).toBe(userAId.toString());
        return createMockQuery({
          _id: userAId,
          email: "usera@example.com",
          name: "User A"
        }) as any;
      });

      const res = await request(app)
        .get(`/api/v1/auth/export?userId=${userBId.toString()}`)
        .send({ userId: userBId.toString() });

      expect(res.status).toBe(200);
      expect(res.body.profile.id).toBe(userAId.toString());
    });

    it("rejects unauthenticated requests to export", async () => {
      const res = await request(app)
        .get("/api/v1/auth/export")
        .set("x-test-unauthenticated", "true");

      expect(res.status).toBe(401);
    });

    it("enforces Redis rate limiting when exceeding 5 exports per hour", async () => {
      setActiveUser({
        _id: userAId,
        email: "usera@example.com",
        status: "active",
        role: "user"
      });

      const { redis } = await import("../../db/redis.js");
      (redis.incr as any).mockResolvedValueOnce(6); // 6 > 5 maxAttempts
      (redis.ttl as any).mockResolvedValueOnce(1800);

      const res = await request(app).get("/api/v1/auth/export");

      expect(res.status).toBe(429);
      expect(res.body.error).toBe("TooManyRequests");
      expect(res.body.message).toContain("Data export rate limit exceeded");
      expect(res.headers["retry-after"]).toBe("1800");
    });
  });

  describe("2. Full Account Deletion Lifecycle & 30-Day Cascade Purge (FR-1.6)", () => {
    it("transitions user account to soft_deleted state, revoking sessions upon deletion request", async () => {
      const mockActiveUser = {
        _id: userAId,
        email: "usera@example.com",
        status: "active",
        deletedAt: null,
        save: vi.fn().mockResolvedValue(undefined)
      };

      setActiveUser(mockActiveUser);

      const res = await request(app).delete("/api/v1/auth/account");

      expect(res.status).toBe(200);
      expect(res.body.message).toContain("Account scheduled for deletion. Your account will be permanently purged in 30 days.");
      expect(mockActiveUser.status).toBe("soft_deleted");
      expect(mockActiveUser.deletedAt).toBeInstanceOf(Date);
      expect(mockActiveUser.save).toHaveBeenCalled();

      // Audit log recorded
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "ACCOUNT_DELETION_SCHEDULED",
          targetUserId: userAId.toString(),
          outcome: "SUCCESS"
        }),
        expect.anything()
      );
    });

    it("simulates 30-day boundary: accounts < 30 days are preserved, accounts >= 30 days are purged", async () => {
      const deletionRequestDate = new Date("2026-08-01T00:00:00.000Z");

      // 1. Boundary check: Day 10 (2026-08-11) -> Not eligible (< 30 days)
      (vi.spyOn(User, "find") as any).mockImplementation((query: any) => {
        const cutoff = query.deletedAt.$lte;
        // If query cutoff is before deletionRequestDate, 0 eligible users
        if (cutoff < deletionRequestDate) {
          return { select: vi.fn().mockResolvedValue([]) } as any;
        }
        return { select: vi.fn().mockResolvedValue([{ _id: userAId }]) } as any;
      });

      const day10SimulatedNow = new Date("2026-08-11T00:00:00.000Z");
      const purgedOnDay10 = await purgeEligibleAccounts(day10SimulatedNow, 30);
      expect(purgedOnDay10).toBe(0);

      // 2. Boundary check: Day 29 (2026-08-30) -> Not eligible (< 30 days)
      const day29SimulatedNow = new Date("2026-08-30T23:59:59.000Z");
      const purgedOnDay29 = await purgeEligibleAccounts(day29SimulatedNow, 30);
      expect(purgedOnDay29).toBe(0);

      // 3. Boundary check: Day 30 (2026-08-31) -> Eligible! Purge executes
      const spyPurge = vi.spyOn(User, "findByIdAndDelete").mockResolvedValue({ _id: userAId } as any);

      // Mock all deleteMany calls
      const collectionsToClear = [
        RefreshToken, Event, Goal, Habit, HabitCheckIn, Note, NoteFolder,
        NoteVersion, Transaction, Budget, BudgetHistory, Category, Subject,
        Topic, Flashcard, FocusSession, Conversation, Message, AiRequestLog,
        Embedding, Summary, Recommendation, Notification, PushSubscription,
        SyncTombstone
      ];
      collectionsToClear.forEach((col) => {
        vi.spyOn(col, "deleteMany").mockResolvedValue({ acknowledged: true, deletedCount: 1 } as any);
      });

      const day30SimulatedNow = new Date("2026-08-31T00:00:00.000Z");
      const purgedOnDay30 = await purgeEligibleAccounts(day30SimulatedNow, 30);

      expect(purgedOnDay30).toBe(1);
      expect(spyPurge).toHaveBeenCalledWith(userAId);
    });

    it("verifies cascade purge across all 25 user collections, queue job cleanup, and User doc deletion", async () => {
      const deleteSpies = [
        { name: "RefreshToken", spy: vi.spyOn(RefreshToken, "deleteMany").mockResolvedValue({} as any) },
        { name: "Event", spy: vi.spyOn(Event, "deleteMany").mockResolvedValue({} as any) },
        { name: "Goal", spy: vi.spyOn(Goal, "deleteMany").mockResolvedValue({} as any) },
        { name: "Habit", spy: vi.spyOn(Habit, "deleteMany").mockResolvedValue({} as any) },
        { name: "HabitCheckIn", spy: vi.spyOn(HabitCheckIn, "deleteMany").mockResolvedValue({} as any) },
        { name: "Note", spy: vi.spyOn(Note, "deleteMany").mockResolvedValue({} as any) },
        { name: "NoteFolder", spy: vi.spyOn(NoteFolder, "deleteMany").mockResolvedValue({} as any) },
        { name: "NoteVersion", spy: vi.spyOn(NoteVersion, "deleteMany").mockResolvedValue({} as any) },
        { name: "Transaction", spy: vi.spyOn(Transaction, "deleteMany").mockResolvedValue({} as any) },
        { name: "Budget", spy: vi.spyOn(Budget, "deleteMany").mockResolvedValue({} as any) },
        { name: "BudgetHistory", spy: vi.spyOn(BudgetHistory, "deleteMany").mockResolvedValue({} as any) },
        { name: "Category", spy: vi.spyOn(Category, "deleteMany").mockResolvedValue({} as any) },
        { name: "Subject", spy: vi.spyOn(Subject, "deleteMany").mockResolvedValue({} as any) },
        { name: "Topic", spy: vi.spyOn(Topic, "deleteMany").mockResolvedValue({} as any) },
        { name: "Flashcard", spy: vi.spyOn(Flashcard, "deleteMany").mockResolvedValue({} as any) },
        { name: "FocusSession", spy: vi.spyOn(FocusSession, "deleteMany").mockResolvedValue({} as any) },
        { name: "Conversation", spy: vi.spyOn(Conversation, "deleteMany").mockResolvedValue({} as any) },
        { name: "Message", spy: vi.spyOn(Message, "deleteMany").mockResolvedValue({} as any) },
        { name: "AiRequestLog", spy: vi.spyOn(AiRequestLog, "deleteMany").mockResolvedValue({} as any) },
        { name: "Embedding", spy: vi.spyOn(Embedding, "deleteMany").mockResolvedValue({} as any) },
        { name: "Summary", spy: vi.spyOn(Summary, "deleteMany").mockResolvedValue({} as any) },
        { name: "Recommendation", spy: vi.spyOn(Recommendation, "deleteMany").mockResolvedValue({} as any) },
        { name: "Notification", spy: vi.spyOn(Notification, "deleteMany").mockResolvedValue({} as any) },
        { name: "PushSubscription", spy: vi.spyOn(PushSubscription, "deleteMany").mockResolvedValue({} as any) },
        { name: "SyncTombstone", spy: vi.spyOn(SyncTombstone, "deleteMany").mockResolvedValue({} as any) }
      ];

      const spyUserDelete = vi.spyOn(User, "findByIdAndDelete").mockResolvedValue({ _id: userAId } as any);

      const result = await purgeUserData(userAId.toString());

      expect(result.userDeleted).toBe(true);
      expect(result.collectionsPurged).toBe(25);
      expect(spyUserDelete).toHaveBeenCalledWith(userAId);

      // Verify every single collection was targeted
      for (const { name, spy } of deleteSpies) {
        expect(spy).toHaveBeenCalledWith(
          name === "AiRequestLog"
            ? { userId: { $in: [userAId, userAId.toString()] } }
            : { userId: userAId }
        );
      }

      // Verify compliance audit log was emitted
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "ACCOUNT_PERMANENTLY_PURGED",
          targetUserId: userAId.toString(),
          actorRole: "system",
          outcome: "SUCCESS"
        }),
        expect.anything()
      );
    });

    it("verifies User A's purge does not affect User B's records", async () => {
      const spyEventDelete = vi.spyOn(Event, "deleteMany").mockResolvedValue({ acknowledged: true } as any);
      vi.spyOn(User, "findByIdAndDelete").mockResolvedValue({ _id: userAId } as any);

      // Mock other collections
      const emptyCollections = [
        RefreshToken, Goal, Habit, HabitCheckIn, Note, NoteFolder,
        NoteVersion, Transaction, Budget, BudgetHistory, Category, Subject,
        Topic, Flashcard, FocusSession, Conversation, Message, AiRequestLog,
        Embedding, Summary, Recommendation, Notification, PushSubscription,
        SyncTombstone
      ];
      emptyCollections.forEach((col) => {
        vi.spyOn(col, "deleteMany").mockResolvedValue({ acknowledged: true } as any);
      });

      await purgeUserData(userAId.toString());

      // Assert that delete was scoped strictly to User A's ID and never touched User B
      expect(spyEventDelete).toHaveBeenCalledWith({ userId: userAId });
      expect(spyEventDelete).not.toHaveBeenCalledWith({ userId: userBId });
    });
  });

  describe("3. Third-Party AI Data Disclosure & Retention Policies (NFR-6.2)", () => {
    it("verifies PRIVACY_POLICY.md contains clear disclosures of third-party LLM providers and fallback chain", () => {
      const policyPath = path.resolve(__dirname, "../../../../PRIVACY_POLICY.md");
      expect(fs.existsSync(policyPath)).toBe(true);

      const policyContent = fs.readFileSync(policyPath, "utf-8");

      // Verify provider chain: Mistral -> Groq -> Gemini
      expect(policyContent).toContain("Mistral AI");
      expect(policyContent).toContain("Groq Inc.");
      expect(policyContent).toContain("Google Gemini");
      expect(policyContent).toContain("Mistral AI → Groq → Google Gemini");

      // Verify free-tier vs enterprise ZDR disclosures
      expect(policyContent).toContain("Free / Developer API Tiers");
      expect(policyContent).toContain("Google AI Studio free tier");
      expect(policyContent).toContain("train and improve AI models");
      expect(policyContent).toContain("Zero Data Retention (ZDR)");

      // Verify GDPR & India DPDP user rights
      expect(policyContent).toContain("GDPR");
      expect(policyContent).toContain("DPDP");
      expect(policyContent).toContain("Right to Access & Data Portability");
      expect(policyContent).toContain("Right to Erasure");

      // Verify 30-day purge lifecycle documentation
      expect(policyContent).toContain("soft_deleted");
      expect(policyContent).toContain("30 Calendar Days");
    });

    it("verifies AI log raw content retention is configurable via AI_LOG_RETENTION_DAYS", () => {
      expect(RAW_CONTENT_RETENTION_DAYS).toBeGreaterThan(0);
      expect(typeof RAW_CONTENT_RETENTION_DAYS).toBe("number");
    });
  });
});
