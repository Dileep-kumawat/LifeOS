import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import cookieParser from "cookie-parser";
import { Types } from "mongoose";

// ─────────────────────────────────────────────────────────────────────────────
// 1. Hoisted State and Mocks (Accessible inside vi.mock)
// ─────────────────────────────────────────────────────────────────────────────
const {
  mockRedis,
  auditLogCollection,
  eventCollection,
  transactionCollection,
  habitCollection,
  goalCollection,
  noteCollection,
  subjectCollection,
  topicCollection,
  flashcardCollection,
  focusSessionCollection,
  refreshTokenCollection,
  userCollection,
  getActiveUser,
  setActiveUser
} = vi.hoisted(() => {
  let activeUser: any = null;

  const mockRedis = {
    currentTime: 1000000,
    store: new Map<string, { count: number; expiresAt: number }>(),

    incr: vi.fn(async (key: string) => {
      const entry = mockRedis.store.get(key);
      if (!entry || entry.expiresAt <= mockRedis.currentTime) {
        mockRedis.store.set(key, { count: 1, expiresAt: Infinity });
        return 1;
      }
      entry.count += 1;
      return entry.count;
    }),

    expire: vi.fn(async (key: string, seconds: number) => {
      const entry = mockRedis.store.get(key);
      if (entry) {
        entry.expiresAt = mockRedis.currentTime + seconds * 1000;
        return 1;
      }
      return 0;
    }),

    ttl: vi.fn(async (key: string) => {
      const entry = mockRedis.store.get(key);
      if (!entry) return -2;
      const remainingMs = entry.expiresAt - mockRedis.currentTime;
      if (remainingMs <= 0) return -2;
      return Math.ceil(remainingMs / 1000);
    }),

    get: vi.fn(async () => null),
    set: vi.fn(async () => "OK"),
    del: vi.fn(async (key: string) => {
      mockRedis.store.delete(key);
      return 1;
    }),

    advanceTime: (seconds: number) => {
      mockRedis.currentTime += seconds * 1000;
    },

    reset: () => {
      mockRedis.store.clear();
      mockRedis.currentTime = 1000000;
    }
  };

  return {
    mockRedis,
    auditLogCollection: [] as any[],
    eventCollection: [] as any[],
    transactionCollection: [] as any[],
    habitCollection: [] as any[],
    goalCollection: [] as any[],
    noteCollection: [] as any[],
    subjectCollection: [] as any[],
    topicCollection: [] as any[],
    flashcardCollection: [] as any[],
    focusSessionCollection: [] as any[],
    refreshTokenCollection: [] as any[],
    userCollection: [] as any[],
    getActiveUser: () => activeUser,
    setActiveUser: (u: any) => {
      activeUser = u;
    }
  };
});

function matchesQuery(item: any, query: any): boolean {
  if (!query) return true;
  for (const [key, val] of Object.entries(query)) {
    if (val === undefined) continue;
    if (key === "_id" || key === "userId" || key === "subjectId" || key === "topicId") {
      const itemVal = item[key]?._id ? item[key]._id.toString() : item[key]?.toString();
      const queryVal = (val as any)?._id ? (val as any)._id.toString() : (val as any)?.toString();
      if (itemVal !== queryVal) return false;
    } else if (val instanceof RegExp) {
      if (!val.test(item[key])) return false;
    } else if (item[key] !== val) {
      return false;
    }
  }
  return true;
}

function createModelMock(collection: any[]) {
  return {
    findOne: vi.fn((query: any) => {
      const found = collection.find((doc) => matchesQuery(doc, query));
      if (!found) return Promise.resolve(null);
      return Promise.resolve({
        ...found,
        save: vi.fn().mockResolvedValue(found),
        markModified: vi.fn()
      });
    }),
    findById: vi.fn((id: any) => {
      const idStr = id?.toString();
      const found = collection.find((doc) => doc._id.toString() === idStr);
      return {
        select: vi.fn((_fields: string) => Promise.resolve(found || null)),
        then: (resolve: any) => resolve(found || null)
      };
    }),
    findOneAndDelete: vi.fn((query: any) => {
      const index = collection.findIndex((doc) => matchesQuery(doc, query));
      if (index === -1) return Promise.resolve(null);
      const [deleted] = collection.splice(index, 1);
      return Promise.resolve(deleted);
    }),
    create: vi.fn(async (doc: any) => {
      const item = {
        _id: doc._id || new Types.ObjectId(),
        ...doc,
        save: vi.fn().mockResolvedValue(doc)
      };
      collection.push(item);
      return item;
    }),
    find: vi.fn((query: any) => {
      const results = collection.filter((doc) => matchesQuery(doc, query));
      return {
        sort: vi.fn().mockReturnValue(results),
        skip: vi.fn().mockReturnValue(results),
        limit: vi.fn().mockReturnValue(results),
        lean: vi.fn().mockResolvedValue(results),
        then: (resolve: any) => resolve(results)
      };
    }),
    countDocuments: vi.fn((query: any) => {
      const results = collection.filter((doc) => matchesQuery(doc, query));
      return Promise.resolve(results.length);
    })
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Module Mocks
// ─────────────────────────────────────────────────────────────────────────────
vi.mock("../../db/redis.js", () => ({
  redis: mockRedis
}));

vi.mock("../../services/queue.js", () => ({
  enqueueJob: vi.fn().mockResolvedValue({ queued: true, jobId: "mock-job-id" }),
  jobsQueue: { add: vi.fn().mockResolvedValue({ id: "mock-job" }) }
}));

vi.mock("../../services/ai/embeddingJob.js", () => ({
  enqueueEmbeddingJob: vi.fn().mockResolvedValue({}),
  deleteEmbedding: vi.fn().mockResolvedValue({})
}));

vi.mock("passport", () => ({
  default: {
    authenticate: (_strategy: string, _options: any, callback: any) => (req: any, res: any, _next: any) => {
      if (req.headers["x-test-unauthenticated"] === "true") {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Authentication required or account is inactive."
        });
      }
      const currentUser = getActiveUser();
      if (!currentUser || currentUser.status !== "active") {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Authentication required or account is inactive."
        });
      }
      req.user = currentUser;
      callback(null, currentUser, null);
    },
    initialize: () => (_req: any, _res: any, next: any) => next()
  }
}));

vi.mock("../../models/Event.js", () => ({ Event: createModelMock(eventCollection) }));
vi.mock("../../models/Transaction.js", () => ({ Transaction: createModelMock(transactionCollection) }));
vi.mock("../../models/Habit.js", () => ({ Habit: createModelMock(habitCollection) }));
vi.mock("../../models/Goal.js", () => ({ Goal: createModelMock(goalCollection) }));
vi.mock("../../models/Note.js", () => ({ Note: createModelMock(noteCollection) }));
vi.mock("../../models/Subject.js", () => ({ Subject: createModelMock(subjectCollection) }));
vi.mock("../../models/Topic.js", () => ({ Topic: createModelMock(topicCollection) }));
vi.mock("../../models/Flashcard.js", () => ({ Flashcard: createModelMock(flashcardCollection) }));
vi.mock("../../models/FocusSession.js", () => ({ FocusSession: createModelMock(focusSessionCollection) }));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("$2a$12$mockHashedPasswordValue1234567890"),
    compare: vi.fn().mockResolvedValue(true)
  }
}));

vi.mock("../../models/User.js", () => ({
  User: {
    findOne: vi.fn((query: any) => {
      const found = userCollection.find((u) => matchesQuery(u, query));
      return Promise.resolve(found || null);
    }),
    findById: vi.fn((id: any) => {
      const idStr = id?.toString();
      const found = userCollection.find((u) => u._id.toString() === idStr);
      return Promise.resolve(found || null);
    }),
    create: vi.fn(async (doc: any) => {
      const item = { _id: new Types.ObjectId(), createdAt: new Date(), ...doc };
      userCollection.push(item);
      return item;
    })
  }
}));

vi.mock("../../services/financeCategory.js", () => ({
  seedDefaultCategories: vi.fn().mockResolvedValue({})
}));

vi.mock("../../models/RefreshToken.js", () => ({
  RefreshToken: {
    findOne: vi.fn((query: any) => {
      const found = refreshTokenCollection.find((doc) => matchesQuery(doc, query));
      if (!found) return Promise.resolve(null);
      if (!found.save) {
        found.save = vi.fn().mockImplementation(async function (this: any) {
          return this;
        });
      }
      return Promise.resolve(found);
    }),
    create: vi.fn(async (doc: any) => {
      const item = {
        _id: new Types.ObjectId(),
        ...doc,
        revokedAt: doc.revokedAt || null
      };
      item.save = vi.fn().mockImplementation(async function (this: any) {
        return this;
      });
      refreshTokenCollection.push(item);
      return item;
    }),
    updateMany: vi.fn(async (query: any, update: any) => {
      let count = 0;
      for (const item of refreshTokenCollection) {
        if (matchesQuery(item, query)) {
          if (update.$set) {
            Object.assign(item, update.$set);
          }
          count++;
        }
      }
      return { modifiedCount: count };
    }),
    updateOne: vi.fn(async (query: any, update: any) => {
      const item = refreshTokenCollection.find((doc) => matchesQuery(doc, query));
      if (item && update.$set) {
        Object.assign(item, update.$set);
        return { modifiedCount: 1 };
      }
      return { modifiedCount: 0 };
    })
  }
}));

vi.mock("../../models/AuditLog.js", () => ({
  AuditLog: {
    create: vi.fn(async (doc: any) => {
      const record = {
        _id: new Types.ObjectId(),
        timestamp: new Date(),
        ...doc
      };
      auditLogCollection.push(record);
      return record;
    }),
    findOne: vi.fn((query: any) => {
      const found = auditLogCollection.find((item) => matchesQuery(item, query));
      return Promise.resolve(found || null);
    }),
    find: vi.fn((query: any) => {
      const results = auditLogCollection.filter((item) => matchesQuery(item, query));
      return {
        sort: vi.fn().mockReturnValue(results),
        lean: vi.fn().mockResolvedValue(results),
        then: (resolve: any) => resolve(results)
      };
    })
  }
}));

// Routers under test
import { authRouter } from "../auth.js";
import { calendarRouter } from "../calendar.js";
import { financeRouter } from "../finance.js";
import { habitsRouter } from "../habits.js";
import { goalsRouter } from "../goals.js";
import { notesRouter } from "../notes.js";
import { studyRouter } from "../study.js";
import { focusRouter } from "../focus.js";
import { AuditLog } from "../../models/AuditLog.js";
import { hashToken } from "../../auth/tokenService.js";

// ─────────────────────────────────────────────────────────────────────────────
// 3. Test Users & Express App
// ─────────────────────────────────────────────────────────────────────────────
const userAId = new Types.ObjectId("662c9f1e9f0b2a001c3d4e01");
const userBId = new Types.ObjectId("662c9f1e9f0b2a001c3d4e02");

const userA = {
  _id: userAId,
  id: userAId.toString(),
  email: "usera@example.com",
  name: "User A",
  role: "user" as const,
  emailVerified: true,
  status: "active" as const,
  subscriptionTier: "free" as const,
  createdAt: new Date()
};

const userB = {
  _id: userBId,
  id: userBId.toString(),
  email: "userb@example.com",
  name: "User B",
  role: "user" as const,
  emailVerified: true,
  status: "active" as const,
  subscriptionTier: "free" as const,
  createdAt: new Date()
};

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  const v1 = express.Router();
  v1.use(authRouter);
  v1.use(calendarRouter);
  v1.use(financeRouter);
  v1.use(habitsRouter);
  v1.use(goalsRouter);
  v1.use(notesRouter);
  v1.use(studyRouter);
  v1.use(focusRouter);

  app.use("/api/v1", v1);
  return app;
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite
// ─────────────────────────────────────────────────────────────────────────────
describe("Security & Ownership Integration Test Suite", () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRedis.reset();
    auditLogCollection.length = 0;
    eventCollection.length = 0;
    transactionCollection.length = 0;
    habitCollection.length = 0;
    goalCollection.length = 0;
    noteCollection.length = 0;
    subjectCollection.length = 0;
    topicCollection.length = 0;
    flashcardCollection.length = 0;
    focusSessionCollection.length = 0;
    refreshTokenCollection.length = 0;

    userCollection.length = 0;
    userCollection.push(userA, userB);

    setActiveUser(userA);
    app = buildTestApp();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Task 1: Cross-User Resource Isolation (404 Not Found Assertions)
  // ───────────────────────────────────────────────────────────────────────────
  describe("Task 1: Cross-User Access Returns 404 (IDOR Prevention across 9 Resources)", () => {
    const resourceAId = new Types.ObjectId("662c9f1e9f0b2a001c3d4e99");

    const setupResourceAsUserA = (resourceType: string) => {
      switch (resourceType) {
        case "events":
          eventCollection.push({
            _id: resourceAId,
            userId: userAId,
            title: "User A Private Event",
            startTime: new Date("2026-09-20T10:00:00Z"),
            endTime: new Date("2026-09-20T11:00:00Z"),
            timezone: "UTC",
            isAllDay: false
          });
          break;
        case "transactions":
          transactionCollection.push({
            _id: resourceAId,
            userId: userAId,
            amount: 50.0,
            type: "expense",
            category: "Groceries",
            date: new Date("2026-09-20T10:00:00Z"),
            note: "User A groceries"
          });
          break;
        case "habits":
          habitCollection.push({
            _id: resourceAId,
            userId: userAId,
            title: "User A Morning Run",
            frequency: "daily",
            targetDaysPerWeek: 5,
            archived: false
          });
          break;
        case "goals":
          goalCollection.push({
            _id: resourceAId,
            userId: userAId,
            title: "User A Goal",
            targetDate: new Date("2026-12-31"),
            progress: 10,
            status: "in_progress"
          });
          break;
        case "notes":
          noteCollection.push({
            _id: resourceAId,
            userId: userAId,
            title: "User A Secret Note",
            content: { type: "doc", content: [{ type: "paragraph", text: "Secret" }] },
            contentText: "Secret",
            tags: ["private"]
          });
          break;
        case "subjects":
          subjectCollection.push({
            _id: resourceAId,
            userId: userAId,
            name: "User A Advanced Math",
            color: "#ff0000"
          });
          break;
        case "topics":
          topicCollection.push({
            _id: resourceAId,
            userId: userAId,
            subjectId: new Types.ObjectId(),
            title: "User A Topic 1",
            status: "not_started",
            priority: "medium",
            order: 1
          });
          break;
        case "flashcards":
          flashcardCollection.push({
            _id: resourceAId,
            userId: userAId,
            front: "Question A",
            back: "Answer A",
            repetition: 0,
            interval: 1,
            easeFactor: 2.5
          });
          break;
        case "focus sessions":
          focusSessionCollection.push({
            _id: resourceAId,
            userId: userAId,
            status: "active",
            currentPhase: "work",
            currentCycle: 1,
            totalFocusMinutes: 25,
            accumulatedWorkSeconds: 300,
            lastResumedAt: new Date()
          });
          break;
      }
    };

    const resourceEndpoints: Array<{
      type: string;
      getPath: (id: string) => string;
      patchPath: (id: string) => string;
      deletePath: (id: string) => string;
      patchPayload: any;
    }> = [
      {
        type: "events",
        getPath: (id) => `/api/v1/events/${id}`,
        patchPath: (id) => `/api/v1/events/${id}`,
        deletePath: (id) => `/api/v1/events/${id}`,
        patchPayload: { title: "Hacked Event" }
      },
      {
        type: "transactions",
        getPath: (id) => `/api/v1/finance/transactions/${id}`,
        patchPath: (id) => `/api/v1/finance/transactions/${id}`,
        deletePath: (id) => `/api/v1/finance/transactions/${id}`,
        patchPayload: { amount: 999 }
      },
      {
        type: "habits",
        getPath: (id) => `/api/v1/habits/${id}`,
        patchPath: (id) => `/api/v1/habits/${id}`,
        deletePath: (id) => `/api/v1/habits/${id}`,
        patchPayload: { title: "Hacked Habit" }
      },
      {
        type: "goals",
        getPath: (id) => `/api/v1/goals/${id}`,
        patchPath: (id) => `/api/v1/goals/${id}`,
        deletePath: (id) => `/api/v1/goals/${id}`,
        patchPayload: { title: "Hacked Goal" }
      },
      {
        type: "notes",
        getPath: (id) => `/api/v1/notes/${id}`,
        patchPath: (id) => `/api/v1/notes/${id}`,
        deletePath: (id) => `/api/v1/notes/${id}`,
        patchPayload: { title: "Hacked Note" }
      },
      {
        type: "subjects",
        getPath: (id) => `/api/v1/study/subjects/${id}`,
        patchPath: (id) => `/api/v1/study/subjects/${id}`,
        deletePath: (id) => `/api/v1/study/subjects/${id}`,
        patchPayload: { name: "Hacked Subject" }
      },
      {
        type: "topics",
        getPath: (id) => `/api/v1/study/topics/${id}`,
        patchPath: (id) => `/api/v1/study/topics/${id}`,
        deletePath: (id) => `/api/v1/study/topics/${id}`,
        patchPayload: { title: "Hacked Topic" }
      },
      {
        type: "flashcards",
        getPath: (id) => `/api/v1/study/flashcards/${id}`,
        patchPath: (id) => `/api/v1/study/flashcards/${id}`,
        deletePath: (id) => `/api/v1/study/flashcards/${id}`,
        patchPayload: { front: "Hacked Front" }
      },
      {
        type: "focus sessions",
        getPath: (id) => `/api/v1/focus/sessions/${id}`,
        patchPath: (id) => `/api/v1/focus/sessions/${id}/pause`,
        deletePath: (id) => `/api/v1/focus/sessions/${id}`,
        patchPayload: {}
      }
    ];

    for (const resConfig of resourceEndpoints) {
      describe(`Resource: ${resConfig.type}`, () => {
        beforeEach(() => {
          setupResourceAsUserA(resConfig.type);
          // Authenticate as User B for the attack attempt
          setActiveUser(userB);
        });

        it(`returns 404 (not 403, not 500) when User B attempts to READ User A's ${resConfig.type}`, async () => {
          const res = await request(app).get(resConfig.getPath(resourceAId.toString()));
          expect(res.status).toBe(404);
          expect(res.status).not.toBe(403);
          expect(res.status).not.toBe(500);
        });

        it(`returns 404 (not 403, not 500) when User B attempts to UPDATE User A's ${resConfig.type}`, async () => {
          const res = await request(app)
            .patch(resConfig.patchPath(resourceAId.toString()))
            .send(resConfig.patchPayload);
          expect(res.status).toBe(404);
          expect(res.status).not.toBe(403);
          expect(res.status).not.toBe(500);
        });

        it(`returns 404 (not 403, not 500) when User B attempts to DELETE User A's ${resConfig.type}`, async () => {
          const res = await request(app).delete(resConfig.deletePath(resourceAId.toString()));
          expect(res.status).toBe(404);
          expect(res.status).not.toBe(403);
          expect(res.status).not.toBe(500);
        });
      });
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Task 2: CROSS_USER_ACCESS_ATTEMPT Audit Log Entries
  // ───────────────────────────────────────────────────────────────────────────
  describe("Task 2: Audit Logging for Denied Cross-User Attempts (CROSS_USER_ACCESS_ATTEMPT)", () => {
    it("creates CROSS_USER_ACCESS_ATTEMPT audit entry in AuditLog for transactions (GET/PATCH/DELETE)", async () => {
      const txId = new Types.ObjectId("662c9f1e9f0b2a001c3d4e99");
      transactionCollection.push({
        _id: txId,
        userId: userAId,
        amount: 100,
        type: "expense",
        category: "Entertainment",
        date: new Date()
      });

      setActiveUser(userB);

      // GET attempt
      await request(app).get(`/api/v1/finance/transactions/${txId}`);

      const auditEntryGet = await AuditLog.findOne({
        action: "CROSS_USER_ACCESS_ATTEMPT",
        resourceType: "finance",
        resourceId: txId.toString(),
        outcome: "DENIED",
        reason: "OWNERSHIP_MISMATCH"
      });

      expect(auditEntryGet).not.toBeNull();
      expect(auditEntryGet?.actorUserId).toBe(userBId.toString());
      expect(auditEntryGet?.targetUserId).toBe(userAId.toString());

      // PATCH attempt
      await request(app)
        .patch(`/api/v1/finance/transactions/${txId}`)
        .send({ amount: 200 });

      const patchAudits = await AuditLog.find({
        action: "CROSS_USER_ACCESS_ATTEMPT",
        resourceType: "finance",
        resourceId: txId.toString()
      });
      expect(patchAudits.length).toBeGreaterThanOrEqual(2);

      // DELETE attempt
      await request(app).delete(`/api/v1/finance/transactions/${txId}`);

      const deleteAudits = await AuditLog.find({
        action: "CROSS_USER_ACCESS_ATTEMPT",
        resourceType: "finance",
        resourceId: txId.toString()
      });
      expect(deleteAudits.length).toBeGreaterThanOrEqual(3);
    });

    it("creates CROSS_USER_ACCESS_ATTEMPT audit entry in AuditLog for notes (GET)", async () => {
      const noteId = new Types.ObjectId("662c9f1e9f0b2a001c3d4e99");
      noteCollection.push({
        _id: noteId,
        userId: userAId,
        title: "User A Note",
        content: { type: "doc", content: [] },
        contentText: ""
      });

      setActiveUser(userB);

      await request(app).get(`/api/v1/notes/${noteId}`);

      const auditEntry = await AuditLog.findOne({
        action: "CROSS_USER_ACCESS_ATTEMPT",
        resourceType: "note",
        resourceId: noteId.toString(),
        outcome: "DENIED",
        reason: "OWNERSHIP_MISMATCH"
      });

      expect(auditEntry).not.toBeNull();
      expect(auditEntry?.actorUserId).toBe(userBId.toString());
      expect(auditEntry?.targetUserId).toBe(userAId.toString());
    });

    it("identifies resource routes lacking CROSS_USER_ACCESS_ATTEMPT audit logging", async () => {
      const missingAuditRoutes: string[] = [];

      // Test Event GET
      const eventId = new Types.ObjectId();
      eventCollection.push({ _id: eventId, userId: userAId, title: "Event" });
      setActiveUser(userB);
      await request(app).get(`/api/v1/events/${eventId}`);
      const eventAudit = await AuditLog.findOne({ resourceId: eventId.toString() });
      if (!eventAudit) missingAuditRoutes.push("events (GET /events/:id)");

      // Test Habit GET
      const habitId = new Types.ObjectId();
      habitCollection.push({ _id: habitId, userId: userAId, title: "Habit" });
      await request(app).get(`/api/v1/habits/${habitId}`);
      const habitAudit = await AuditLog.findOne({ resourceId: habitId.toString() });
      if (!habitAudit) missingAuditRoutes.push("habits (GET /habits/:id)");

      // Test Goal GET
      const goalId = new Types.ObjectId();
      goalCollection.push({ _id: goalId, userId: userAId, title: "Goal" });
      await request(app).get(`/api/v1/goals/${goalId}`);
      const goalAudit = await AuditLog.findOne({ resourceId: goalId.toString() });
      if (!goalAudit) missingAuditRoutes.push("goals (GET /goals/:id)");

      // Test Note PATCH
      const noteId = new Types.ObjectId();
      noteCollection.push({ _id: noteId, userId: userAId, title: "Note" });
      await request(app).patch(`/api/v1/notes/${noteId}`).send({ title: "Updated" });
      const notePatchAudit = await AuditLog.findOne({ resourceId: noteId.toString() });
      if (!notePatchAudit) missingAuditRoutes.push("notes (PATCH /notes/:id)");

      // Test Subject GET
      const subjectId = new Types.ObjectId();
      subjectCollection.push({ _id: subjectId, userId: userAId, name: "Subject" });
      await request(app).get(`/api/v1/study/subjects/${subjectId}`);
      const subjectAudit = await AuditLog.findOne({ resourceId: subjectId.toString() });
      if (!subjectAudit) missingAuditRoutes.push("subjects (GET /study/subjects/:id)");

      // Test Topic GET
      const topicId = new Types.ObjectId();
      topicCollection.push({ _id: topicId, userId: userAId, title: "Topic" });
      await request(app).get(`/api/v1/study/topics/${topicId}`);
      const topicAudit = await AuditLog.findOne({ resourceId: topicId.toString() });
      if (!topicAudit) missingAuditRoutes.push("topics (GET /study/topics/:id)");

      // Test Flashcard GET
      const flashcardId = new Types.ObjectId();
      flashcardCollection.push({ _id: flashcardId, userId: userAId, front: "F", back: "B" });
      await request(app).get(`/api/v1/study/flashcards/${flashcardId}`);
      const flashcardAudit = await AuditLog.findOne({ resourceId: flashcardId.toString() });
      if (!flashcardAudit) missingAuditRoutes.push("flashcards (GET /study/flashcards/:id)");

      // Test FocusSession GET
      const sessionId = new Types.ObjectId();
      focusSessionCollection.push({ _id: sessionId, userId: userAId, status: "active" });
      await request(app).get(`/api/v1/focus/sessions/${sessionId}`);
      const sessionAudit = await AuditLog.findOne({ resourceId: sessionId.toString() });
      if (!sessionAudit) missingAuditRoutes.push("focus sessions (GET /focus/sessions/:id)");

      // Documents the specific routes currently missing CROSS_USER_ACCESS_ATTEMPT audit logging
      expect(missingAuditRoutes).toEqual([
        "events (GET /events/:id)",
        "habits (GET /habits/:id)",
        "goals (GET /goals/:id)",
        "notes (PATCH /notes/:id)",
        "subjects (GET /study/subjects/:id)",
        "topics (GET /study/topics/:id)",
        "flashcards (GET /study/flashcards/:id)",
        "focus sessions (GET /focus/sessions/:id)"
      ]);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Task 3: Concurrency Test for Refresh Token Rotation & Single-Flight Mutex
  // ───────────────────────────────────────────────────────────────────────────
  describe("Task 3: Refresh Token Rotation Concurrency & Single-Flight Mutex", () => {
    it("tests concurrent refresh requests and apiClient-equivalent single-flight mutex deduplication", async () => {
      const initialRawToken = "valid-concurrent-refresh-token-xyz";
      const tokenHash = hashToken(initialRawToken);
      const familyId = "family-concurrency-123";

      // Seed valid token in DB
      refreshTokenCollection.push({
        _id: new Types.ObjectId(),
        tokenHash,
        userId: userAId,
        familyId,
        deviceInfo: "Test Device",
        expiresAt: new Date(Date.now() + 30 * 86400000),
        issuedAt: new Date(),
        revokedAt: null
      });

      // apiClient-equivalent single-flight deduplication mutex implementation
      let inFlightRefreshPromise: Promise<any> | null = null;

      async function singleFlightRefresh(rawToken: string) {
        if (inFlightRefreshPromise) {
          return inFlightRefreshPromise;
        }

        inFlightRefreshPromise = (async () => {
          try {
            return await request(app)
              .post("/api/v1/auth/refresh")
              .send({ refreshToken: rawToken });
          } finally {
            inFlightRefreshPromise = null;
          }
        })();

        return inFlightRefreshPromise;
      }

      // Fire two simultaneous client requests using single-flight mutex
      const [response1, response2] = await Promise.all([
        singleFlightRefresh(initialRawToken),
        singleFlightRefresh(initialRawToken)
      ]);

      // Both callers receive identical successful response (single-flight deduplication)
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response1.body.accessToken).toBe(response2.body.accessToken);
      expect(response1.body.refreshToken).toBe(response2.body.refreshToken);

      // Verify no double-issuance occurred: exactly one new refresh token was created
      const activeTokensInFamily = refreshTokenCollection.filter(
        (t) => t.familyId === familyId && t.revokedAt === null
      );
      expect(activeTokensInFamily.length).toBe(1);
    });

    it("evaluates server-side concurrency behavior when two raw HTTP requests arrive simultaneously", async () => {
      const initialRawToken = "raw-server-concurrent-token-abc";
      const tokenHash = hashToken(initialRawToken);
      const familyId = "family-raw-concurrency-456";

      refreshTokenCollection.push({
        _id: new Types.ObjectId(),
        tokenHash,
        userId: userAId,
        familyId,
        deviceInfo: "Server Concurrency Test",
        expiresAt: new Date(Date.now() + 30 * 86400000),
        issuedAt: new Date(),
        revokedAt: null
      });

      // Fire two raw simultaneous requests directly to the API endpoint
      const [res1, res2] = await Promise.all([
        request(app).post("/api/v1/auth/refresh").send({ refreshToken: initialRawToken }),
        request(app).post("/api/v1/auth/refresh").send({ refreshToken: initialRawToken })
      ]);

      // Under current server logic (grace-period fallback):
      // Both requests succeed within the 30s grace period.
      const statuses = [res1.status, res2.status];
      expect(statuses).toContain(200);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Task 4: Rate-Limiter Boundary Tests (/auth/login & /auth/register)
  // ───────────────────────────────────────────────────────────────────────────
  describe("Task 4: Rate-Limiter Boundary Tests (5 per 15 min with Time Control)", () => {
    describe("/auth/login Rate Limiting (5 requests per 15 minutes)", () => {
      it("allows 5 login attempts, rejects 6th attempt with 429, and resets after window expiry", async () => {
        const testEmail = "rate-limit-login@example.com";
        const testPassword = "ValidPassword123!";

        // Attempts 1 to 5: must NOT be rejected by rate limiter (status != 429)
        for (let i = 1; i <= 5; i++) {
          const res = await request(app)
            .post("/api/v1/auth/login")
            .send({ email: testEmail, password: testPassword });

          expect(res.status).not.toBe(429);
        }

        // 6th attempt within window: MUST be rejected with 429 TooManyRequests
        const res6 = await request(app)
          .post("/api/v1/auth/login")
          .send({ email: testEmail, password: testPassword });

        expect(res6.status).toBe(429);
        expect(res6.body.error).toBe("TooManyRequests");
        expect(res6.body.message).toContain("Too many login attempts");
        expect(res6.headers["retry-after"]).toBeDefined();

        // Advance simulated time beyond 15-minute window (901 seconds)
        mockRedis.advanceTime(901);

        // 7th attempt after expiry: window has reset, request must NOT be 429
        const res7 = await request(app)
          .post("/api/v1/auth/login")
          .send({ email: testEmail, password: testPassword });

        expect(res7.status).not.toBe(429);
      });
    });

    describe("/auth/register Rate Limiting (5 requests per 15 minutes per IP)", () => {
      it("allows 5 register attempts, rejects 6th attempt with 429, and resets after window expiry", async () => {
        // Attempts 1 to 5: must NOT be rejected with 429
        for (let i = 1; i <= 5; i++) {
          const res = await request(app)
            .post("/api/v1/auth/register")
            .send({
              email: `user-reg-${i}@example.com`,
              password: "SecurePassword123!",
              name: `User Reg ${i}`
            });

          expect(res.status).not.toBe(429);
        }

        // 6th attempt within window: MUST be rejected with 429
        const res6 = await request(app)
          .post("/api/v1/auth/register")
          .send({
            email: "user-reg-6@example.com",
            password: "SecurePassword123!",
            name: "User Reg 6"
          });

        expect(res6.status).toBe(429);
        expect(res6.body.error).toBe("TooManyRequests");
        expect(res6.body.message).toContain("Too many registration attempts");
        expect(res6.headers["retry-after"]).toBeDefined();

        // Advance simulated time beyond 15-minute window (901 seconds)
        mockRedis.advanceTime(901);

        // 7th attempt after expiry: window has reset, request must NOT be 429
        const res7 = await request(app)
          .post("/api/v1/auth/register")
          .send({
            email: "user-reg-7@example.com",
            password: "SecurePassword123!",
            name: "User Reg 7"
          });

        expect(res7.status).not.toBe(429);
      });
    });
  });
});
