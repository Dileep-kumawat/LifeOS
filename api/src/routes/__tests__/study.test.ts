import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { Types } from "mongoose";

const testUserId = new Types.ObjectId("662c9f1e9f0b2a001c3d4e0a");

// Mock auth middleware to inject standard test user
vi.mock("../../middleware/authMiddleware.js", () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = {
      _id: testUserId,
      tier: "free",
      status: "active"
    };
    next();
  }
}));

// In-memory mock database collections
interface MockSubject {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  color: string;
  examDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  save: () => Promise<MockSubject>;
}

interface MockTopic {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  subjectId: Types.ObjectId;
  title: string;
  deadline: Date | null;
  priority: "low" | "medium" | "high";
  status: "not_started" | "in_progress" | "completed";
  estimatedMinutes: number | null;
  createdAt: Date;
  updatedAt: Date;
  save: () => Promise<MockTopic>;
}

interface MockFlashcard {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  subjectId: Types.ObjectId | null;
  topicId: Types.ObjectId | null;
  front: string;
  back: string;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReviewDate: Date;
  createdAt: Date;
  updatedAt: Date;
  save: () => Promise<MockFlashcard>;
}

let subjectsStore: MockSubject[] = [];
let topicsStore: MockTopic[] = [];
let flashcardsStore: MockFlashcard[] = [];

interface MockStudyFocusSession {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  workMinutes: number;
  breakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number;
  currentCycle: number;
  currentPhase: "work" | "break" | "long_break";
  linkedType: "task" | "goal" | "topic" | "none";
  linkedId: string | null;
  status: "active" | "paused" | "completed" | "abandoned";
  startedAt: Date;
  completedAt: Date | null;
  accumulatedWorkSeconds: number;
  totalFocusMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}

interface MockStudyEvent {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  startTime: Date;
  endTime: Date;
  linkedTopicId: Types.ObjectId | null;
  status?: string;
}

let focusSessionsStore: MockStudyFocusSession[] = [];
let eventsStore: MockStudyEvent[] = [];


function createMockQuery<T>(results: T[]) {
  const promise = Promise.resolve(results);
  return {
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    sort: vi.fn().mockImplementation((sortFnOrObj?: any) => {
      let sorted = [...results];
      if (sortFnOrObj && sortFnOrObj.nextReviewDate) {
        sorted.sort((a: any, b: any) => a.nextReviewDate.getTime() - b.nextReviewDate.getTime());
      }
      return createMockQuery(sorted);
    }),
    limit: vi.fn().mockImplementation((limitNum: number) => {
      return createMockQuery(results.slice(0, limitNum));
    }),
    skip: vi.fn().mockImplementation((skipNum: number) => {
      return createMockQuery(results.slice(skipNum));
    })
  };
}


// Mock Mongoose models
vi.mock("../../models/Subject.js", () => ({
  Subject: {
    create: vi.fn().mockImplementation((data: any) => {
      const doc: MockSubject = {
        _id: new Types.ObjectId(),
        userId: data.userId,
        name: data.name,
        color: data.color || "#0075de",
        examDate: data.examDate ? new Date(data.examDate) : null,
        createdAt: new Date(),
        updatedAt: new Date(),
        save: async function () {
          this.updatedAt = new Date();
          return this;
        }
      };
      subjectsStore.push(doc);
      return Promise.resolve(doc);
    }),
    find: vi.fn().mockImplementation((query: any) => {
      let results = subjectsStore.filter(
        (s) => s.userId.toString() === (query.userId?.toString() ?? query.userId)
      );
      return createMockQuery(results);
    }),
    findOne: vi.fn().mockImplementation((query: any) => {
      const found = subjectsStore.find(
        (s) =>
          s._id.toString() === (query._id?.toString() ?? query._id) &&
          s.userId.toString() === (query.userId?.toString() ?? query.userId)
      );
      return Promise.resolve(found || null);
    }),
    deleteOne: vi.fn().mockImplementation((query: any) => {
      const initialLen = subjectsStore.length;
      subjectsStore = subjectsStore.filter(
        (s) =>
          !(
            s._id.toString() === (query._id?.toString() ?? query._id) &&
            s.userId.toString() === (query.userId?.toString() ?? query.userId)
          )
      );
      return Promise.resolve({ deletedCount: initialLen - subjectsStore.length });
    })
  }
}));

vi.mock("../../models/Topic.js", () => ({
  Topic: {
    create: vi.fn().mockImplementation((data: any) => {
      const doc: MockTopic = {
        _id: new Types.ObjectId(),
        userId: data.userId,
        subjectId: new Types.ObjectId(data.subjectId.toString()),
        title: data.title,
        deadline: data.deadline ? new Date(data.deadline) : null,
        priority: data.priority || "medium",
        status: data.status || "not_started",
        estimatedMinutes: data.estimatedMinutes ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
        save: async function () {
          this.updatedAt = new Date();
          return this;
        }
      };
      topicsStore.push(doc);
      return Promise.resolve(doc);
    }),
    find: vi.fn().mockImplementation((query: any) => {
      let results = topicsStore.filter(
        (t) => t.userId.toString() === (query.userId?.toString() ?? query.userId)
      );
      if (query.subjectId) {
        results = results.filter(
          (t) => t.subjectId.toString() === (query.subjectId?.toString() ?? query.subjectId)
        );
      }
      if (query.status) {
        results = results.filter((t) => t.status === query.status);
      }
      if (query.priority) {
        results = results.filter((t) => t.priority === query.priority);
      }
      if (query.deadline && query.deadline.$lte) {
        results = results.filter((t) => t.deadline !== null && t.deadline <= query.deadline.$lte);
      }
      return createMockQuery(results);
    }),
    findOne: vi.fn().mockImplementation((query: any) => {
      const found = topicsStore.find(
        (t) =>
          t._id.toString() === (query._id?.toString() ?? query._id) &&
          t.userId.toString() === (query.userId?.toString() ?? query.userId)
      );
      return Promise.resolve(found || null);
    }),
    countDocuments: vi.fn().mockImplementation((query: any) => {
      let results = topicsStore.filter(
        (t) => t.userId.toString() === (query.userId?.toString() ?? query.userId)
      );
      if (query.subjectId) {
        results = results.filter(
          (t) => t.subjectId.toString() === (query.subjectId?.toString() ?? query.subjectId)
        );
      }
      if (query.status) {
        results = results.filter((t) => t.status === query.status);
      }
      return Promise.resolve(results.length);
    }),
    deleteOne: vi.fn().mockImplementation((query: any) => {
      const initialLen = topicsStore.length;
      topicsStore = topicsStore.filter(
        (t) =>
          !(
            t._id.toString() === (query._id?.toString() ?? query._id) &&
            t.userId.toString() === (query.userId?.toString() ?? query.userId)
          )
      );
      return Promise.resolve({ deletedCount: initialLen - topicsStore.length });
    }),
    deleteMany: vi.fn().mockImplementation((query: any) => {
      const initialLen = topicsStore.length;
      topicsStore = topicsStore.filter((t) => {
        if (query.userId && t.userId.toString() !== query.userId.toString()) return true;
        if (query.subjectId && t.subjectId.toString() === query.subjectId.toString()) return false;
        return true;
      });
      return Promise.resolve({ deletedCount: initialLen - topicsStore.length });
    })
  }
}));

vi.mock("../../models/Flashcard.js", () => ({
  Flashcard: {
    create: vi.fn().mockImplementation((data: any) => {
      const doc: MockFlashcard = {
        _id: new Types.ObjectId(),
        userId: data.userId,
        subjectId: data.subjectId ? new Types.ObjectId(data.subjectId.toString()) : null,
        topicId: data.topicId ? new Types.ObjectId(data.topicId.toString()) : null,
        front: data.front,
        back: data.back,
        easeFactor: data.easeFactor ?? 2.5,
        intervalDays: data.intervalDays ?? 0,
        repetitions: data.repetitions ?? 0,
        nextReviewDate: data.nextReviewDate ? new Date(data.nextReviewDate) : new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        save: async function () {
          this.updatedAt = new Date();
          return this;
        }
      };
      flashcardsStore.push(doc);
      return Promise.resolve(doc);
    }),
    find: vi.fn().mockImplementation((query: any) => {
      let results = flashcardsStore.filter(
        (f) => f.userId.toString() === (query.userId?.toString() ?? query.userId)
      );
      if (query.topicId) {
        results = results.filter(
          (f) => f.topicId && f.topicId.toString() === (query.topicId?.toString() ?? query.topicId)
        );
      }
      if (query.subjectId) {
        results = results.filter(
          (f) =>
            f.subjectId && f.subjectId.toString() === (query.subjectId?.toString() ?? query.subjectId)
        );
      }
      if (query.nextReviewDate && query.nextReviewDate.$lte) {
        results = results.filter((f) => f.nextReviewDate <= query.nextReviewDate.$lte);
      }
      return createMockQuery(results);
    }),
    findOne: vi.fn().mockImplementation((query: any) => {
      const found = flashcardsStore.find(
        (f) =>
          f._id.toString() === (query._id?.toString() ?? query._id) &&
          f.userId.toString() === (query.userId?.toString() ?? query.userId)
      );
      return Promise.resolve(found || null);
    }),
    countDocuments: vi.fn().mockImplementation((query: any) => {
      let results = flashcardsStore.filter(
        (f) => f.userId.toString() === (query.userId?.toString() ?? query.userId)
      );
      if (query.subjectId) {
        results = results.filter(
          (f) =>
            f.subjectId && f.subjectId.toString() === (query.subjectId?.toString() ?? query.subjectId)
        );
      }
      if (query.nextReviewDate && query.nextReviewDate.$lte) {
        results = results.filter((f) => f.nextReviewDate <= query.nextReviewDate.$lte);
      }
      return Promise.resolve(results.length);
    }),
    deleteOne: vi.fn().mockImplementation((query: any) => {
      const initialLen = flashcardsStore.length;
      flashcardsStore = flashcardsStore.filter(
        (f) =>
          !(
            f._id.toString() === (query._id?.toString() ?? query._id) &&
            f.userId.toString() === (query.userId?.toString() ?? query.userId)
          )
      );
      return Promise.resolve({ deletedCount: initialLen - flashcardsStore.length });
    }),
    deleteMany: vi.fn().mockImplementation((query: any) => {
      const initialLen = flashcardsStore.length;
      flashcardsStore = flashcardsStore.filter((f) => {
        if (query.userId && f.userId.toString() !== query.userId.toString()) return true;
        if (query.topicId && f.topicId && f.topicId.toString() === query.topicId.toString())
          return false;
        if (query.$or) {
          for (const cond of query.$or) {
            if (cond.subjectId && f.subjectId && f.subjectId.toString() === cond.subjectId.toString()) {
              return false;
            }
            if (
              cond.topicId &&
              cond.topicId.$in &&
              f.topicId &&
              cond.topicId.$in.some((id: any) => id.toString() === f.topicId!.toString())
            ) {
              return false;
            }
          }
        }
        return true;
      });
      return Promise.resolve({ deletedCount: initialLen - flashcardsStore.length });
    })
  }
}));

vi.mock("../../models/FocusSession.js", () => ({
  FocusSession: {
    find: vi.fn().mockImplementation((query: any) => {
      let results = focusSessionsStore.filter(
        (s) => s.userId.toString() === (query.userId?.toString() ?? query.userId)
      );
      if (query.linkedType) {
        results = results.filter((s) => s.linkedType === query.linkedType);
      }
      if (query.linkedId) {
        results = results.filter((s) => s.linkedId === query.linkedId);
      }
      return createMockQuery(results);
    }),
    aggregate: vi.fn().mockImplementation((pipeline: any[]) => {
      let docs = [...focusSessionsStore];
      for (const stage of pipeline) {
        if (stage.$match) {
          const match = stage.$match;
          docs = docs.filter((s) => {
            if (match.userId && s.userId.toString() !== match.userId.toString()) return false;
            if (match.linkedType && s.linkedType !== match.linkedType) return false;
            if (match.linkedId && s.linkedId !== match.linkedId) return false;
            return true;
          });
        } else if (stage.$group) {
          if (stage.$group._id === null) {
            let totalFocusMinutes = 0;
            let sessionCount = docs.length;
            let completedCount = 0;
            let abandonedCount = 0;
            for (const s of docs) {
              totalFocusMinutes += s.totalFocusMinutes || 0;
              if (s.status === "completed") completedCount++;
              if (s.status === "abandoned") abandonedCount++;
            }
            return Promise.resolve(
              docs.length > 0
                ? [
                    {
                      _id: null,
                      totalFocusMinutes,
                      sessionCount,
                      completedCount,
                      abandonedCount
                    }
                  ]
                : []
            );
          }
        }
      }
      return Promise.resolve(docs);
    })
  }
}));

vi.mock("../../models/Event.js", () => ({
  Event: {
    find: vi.fn().mockImplementation((query: any) => {
      let results = eventsStore.filter(
        (e) => e.userId.toString() === (query.userId?.toString() ?? query.userId)
      );
      if (query.linkedTopicId) {
        results = results.filter(
          (e) => e.linkedTopicId && e.linkedTopicId.toString() === query.linkedTopicId.toString()
        );
      }
      return createMockQuery(results);
    })
  }
}));

import { studyRouter } from "../study.js";

const app = express();
app.use(express.json());
app.use("/api/v1", studyRouter);

describe("Study Planner Endpoints Integration Suite", () => {
  beforeEach(() => {
    subjectsStore = [];
    topicsStore = [];
    flashcardsStore = [];
    focusSessionsStore = [];
    eventsStore = [];
    vi.clearAllMocks();
  });


  describe("Subject CRUD & Cascade Deletion", () => {
    it("creates a subject and returns 201 with default color", async () => {
      const res = await request(app)
        .post("/api/v1/study/subjects")
        .send({ name: "Algorithms & Complexity" });

      expect(res.status).toBe(201);
      expect(res.body.subject.name).toBe("Algorithms & Complexity");
      expect(res.body.subject.color).toBe("#0075de");
      expect(res.body.subject.examDate).toBeNull();
      expect(subjectsStore).toHaveLength(1);
    });

    it("lists subjects with aggregate topic and flashcard counts", async () => {
      // Seed 1 subject with 2 topics and 1 flashcard
      const subjRes = await request(app)
        .post("/api/v1/study/subjects")
        .send({ name: "Biology 101", color: "#1aae39" });
      const subjectId = subjRes.body.subject.id;

      await request(app)
        .post("/api/v1/study/topics")
        .send({ subjectId, title: "Cell Structure", status: "completed" });
      await request(app)
        .post("/api/v1/study/topics")
        .send({ subjectId, title: "Genetics", status: "not_started" });

      const listRes = await request(app).get("/api/v1/study/subjects");
      expect(listRes.status).toBe(200);
      expect(listRes.body.subjects).toHaveLength(1);
      expect(listRes.body.subjects[0].name).toBe("Biology 101");
      expect(listRes.body.subjects[0].topicsCount).toBe(2);
      expect(listRes.body.subjects[0].completedTopicsCount).toBe(1);
    });

    it("cascade-deletes a subject, its topics, and associated flashcards", async () => {
      // 1. Create subject
      const subjRes = await request(app)
        .post("/api/v1/study/subjects")
        .send({ name: "Organic Chemistry" });
      const subjectId = subjRes.body.subject.id;

      // 2. Create topics under subject
      const topic1Res = await request(app)
        .post("/api/v1/study/topics")
        .send({ subjectId, title: "Alkanes & Alkenes" });
      const topic2Res = await request(app)
        .post("/api/v1/study/topics")
        .send({ subjectId, title: "Stereochemistry" });

      const topic1Id = topic1Res.body.topic.id;
      const topic2Id = topic2Res.body.topic.id;

      // 3. Create flashcards under those topics
      await request(app)
        .post("/api/v1/study/flashcards")
        .send({ topicId: topic1Id, front: "Alkane formula?", back: "C_n H_2n+2" });
      await request(app)
        .post("/api/v1/study/flashcards")
        .send({ topicId: topic2Id, front: "Chirality definition?", back: "Non-superimposable mirror image" });

      expect(subjectsStore).toHaveLength(1);
      expect(topicsStore).toHaveLength(2);
      expect(flashcardsStore).toHaveLength(2);

      // 4. Delete the parent subject
      const delRes = await request(app).delete(`/api/v1/study/subjects/${subjectId}`);
      expect(delRes.status).toBe(200);
      expect(delRes.body.deletedTopicsCount).toBe(2);
      expect(delRes.body.deletedFlashcardsCount).toBe(2);

      // 5. Verify everything is cascade-deleted
      expect(subjectsStore).toHaveLength(0);
      expect(topicsStore).toHaveLength(0);
      expect(flashcardsStore).toHaveLength(0);
    });
  });

  describe("Topic CRUD & Filter Queries", () => {
    it("validates that parent subjectId exists and belongs to user", async () => {
      const nonExistentSubjectId = new Types.ObjectId().toString();
      const res = await request(app)
        .post("/api/v1/study/topics")
        .send({ subjectId: nonExistentSubjectId, title: "Orphaned Topic" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("ValidationError");
    });

    it("filters topics by status and dueSoon proximity", async () => {
      const subjRes = await request(app)
        .post("/api/v1/study/subjects")
        .send({ name: "Physics" });
      const subjectId = subjRes.body.subject.id;

      const dueIn3Days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      const dueIn30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      await request(app).post("/api/v1/study/topics").send({
        subjectId,
        title: "Thermodynamics",
        status: "in_progress",
        deadline: dueIn3Days,
        priority: "high"
      });

      await request(app).post("/api/v1/study/topics").send({
        subjectId,
        title: "Quantum Mechanics",
        status: "not_started",
        deadline: dueIn30Days,
        priority: "medium"
      });

      // Filter by dueSoon
      const dueSoonRes = await request(app).get("/api/v1/study/topics?dueSoon=true");
      expect(dueSoonRes.status).toBe(200);
      expect(dueSoonRes.body.topics).toHaveLength(1);
      expect(dueSoonRes.body.topics[0].title).toBe("Thermodynamics");

      // Filter by status
      const statusRes = await request(app).get("/api/v1/study/topics?status=not_started");
      expect(statusRes.status).toBe(200);
      expect(statusRes.body.topics).toHaveLength(1);
      expect(statusRes.body.topics[0].title).toBe("Quantum Mechanics");
    });
  });

  describe("Flashcard CRUD & SM-2 Spaced Repetition Review Flow", () => {
    it("creates a flashcard with initial SM-2 defaults (easeFactor 2.5, interval 0d)", async () => {
      const res = await request(app)
        .post("/api/v1/study/flashcards")
        .send({
          front: "What is Dijkstra's algorithm time complexity with a Fibonacci heap?",
          back: "O(E + V log V)"
        });

      expect(res.status).toBe(201);
      expect(res.body.flashcard.easeFactor).toBe(2.5);
      expect(res.body.flashcard.intervalDays).toBe(0);
      expect(res.body.flashcard.repetitions).toBe(0);
      expect(res.body.flashcard.nextReviewDate).toBeDefined();
    });

    it("returns due flashcards where nextReviewDate <= now in ascending order (most overdue first)", async () => {
      const pastDate1 = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago (most overdue)
      const pastDate2 = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // 1 day ago
      const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days in future

      // Seed 3 cards directly in mock store
      flashcardsStore.push(
        {
          _id: new Types.ObjectId(),
          userId: testUserId,
          subjectId: null,
          topicId: null,
          front: "Card 1 (future)",
          back: "Back 1",
          easeFactor: 2.5,
          intervalDays: 5,
          repetitions: 1,
          nextReviewDate: futureDate,
          createdAt: new Date(),
          updatedAt: new Date(),
          save: async function () {
            return this;
          }
        },
        {
          _id: new Types.ObjectId(),
          userId: testUserId,
          subjectId: null,
          topicId: null,
          front: "Card 2 (1d overdue)",
          back: "Back 2",
          easeFactor: 2.5,
          intervalDays: 1,
          repetitions: 1,
          nextReviewDate: pastDate2,
          createdAt: new Date(),
          updatedAt: new Date(),
          save: async function () {
            return this;
          }
        },
        {
          _id: new Types.ObjectId(),
          userId: testUserId,
          subjectId: null,
          topicId: null,
          front: "Card 3 (3d overdue)",
          back: "Back 3",
          easeFactor: 2.5,
          intervalDays: 1,
          repetitions: 1,
          nextReviewDate: pastDate1,
          createdAt: new Date(),
          updatedAt: new Date(),
          save: async function () {
            return this;
          }
        }
      );

      const dueRes = await request(app).get("/api/v1/study/flashcards/due");
      expect(dueRes.status).toBe(200);
      expect(dueRes.body.count).toBe(2);
      expect(dueRes.body.flashcards).toHaveLength(2);
      // Verify ascending order: 3d overdue first, then 1d overdue
      expect(dueRes.body.flashcards[0].front).toBe("Card 3 (3d overdue)");
      expect(dueRes.body.flashcards[1].front).toBe("Card 2 (1d overdue)");
    });

    it("executes SM-2 review calculation and updates card parameters", async () => {
      const cardRes = await request(app)
        .post("/api/v1/study/flashcards")
        .send({ front: "TCP 3-way handshake steps?", back: "SYN -> SYN-ACK -> ACK" });
      const cardId = cardRes.body.flashcard.id;

      // 1. Initial review: score 4 (good) -> interval: 1, reps: 1, EF: 2.5
      const rev1 = await request(app)
        .post(`/api/v1/study/flashcards/${cardId}/review`)
        .send({ quality: 4 });

      expect(rev1.status).toBe(200);
      expect(rev1.body.flashcard.repetitions).toBe(1);
      expect(rev1.body.flashcard.intervalDays).toBe(1);
      expect(rev1.body.flashcard.easeFactor).toBe(2.5);

      // 2. Second review: score 5 (perfect) -> interval: 6, reps: 2, EF: 2.6
      const rev2 = await request(app)
        .post(`/api/v1/study/flashcards/${cardId}/review`)
        .send({ quality: 5 });

      expect(rev2.status).toBe(200);
      expect(rev2.body.flashcard.repetitions).toBe(2);
      expect(rev2.body.flashcard.intervalDays).toBe(6);
      expect(rev2.body.flashcard.easeFactor).toBe(2.6);

      // 3. Failed review: score 1 (failed) -> resets reps to 0 and interval to 1
      const rev3 = await request(app)
        .post(`/api/v1/study/flashcards/${cardId}/review`)
        .send({ quality: 1 });

      expect(rev3.status).toBe(200);
      expect(rev3.body.flashcard.repetitions).toBe(0);
      expect(rev3.body.flashcard.intervalDays).toBe(1);
      expect(rev3.body.flashcard.easeFactor).toBeLessThan(2.6);
    });

    it("rejects invalid review quality score (<0 or >5) with 400 Bad Request", async () => {
      const cardRes = await request(app)
        .post("/api/v1/study/flashcards")
        .send({ front: "Q", back: "A" });
      const cardId = cardRes.body.flashcard.id;

      const badScoreRes = await request(app)
        .post(`/api/v1/study/flashcards/${cardId}/review`)
        .send({ quality: 7 });

      expect(badScoreRes.status).toBe(400);
      expect(badScoreRes.body.error).toBe("ValidationError");
    });
  });

  describe("Topic Focus Time & Combined Detail Linkage (FR-7.4)", () => {
    it("sums only sessions linked to that specific topic, ignoring sibling topics under the same subject", async () => {
      // Create a Subject
      const subj = await request(app)
        .post("/api/v1/study/subjects")
        .send({ name: "Computer Science" });
      const subjectId = subj.body.subject.id;

      // Create Topic A and Topic B under the same Subject
      const topARes = await request(app)
        .post("/api/v1/study/topics")
        .send({ subjectId, title: "Topic A - Graphs" });
      const topicAId = topARes.body.topic.id;

      const topBRes = await request(app)
        .post("/api/v1/study/topics")
        .send({ subjectId, title: "Topic B - Dynamic Programming" });
      const topicBId = topBRes.body.topic.id;

      // Seed 2 completed sessions for Topic A (25m + 50m = 75m)
      focusSessionsStore.push({
        _id: new Types.ObjectId(),
        userId: testUserId,
        workMinutes: 25,
        breakMinutes: 5,
        longBreakMinutes: 15,
        longBreakInterval: 4,
        currentCycle: 1,
        currentPhase: "work",
        linkedType: "topic",
        linkedId: topicAId,
        status: "completed",
        startedAt: new Date(),
        completedAt: new Date(),
        accumulatedWorkSeconds: 1500,
        totalFocusMinutes: 25,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      focusSessionsStore.push({
        _id: new Types.ObjectId(),
        userId: testUserId,
        workMinutes: 25,
        breakMinutes: 5,
        longBreakMinutes: 15,
        longBreakInterval: 4,
        currentCycle: 2,
        currentPhase: "work",
        linkedType: "topic",
        linkedId: topicAId,
        status: "completed",
        startedAt: new Date(),
        completedAt: new Date(),
        accumulatedWorkSeconds: 3000,
        totalFocusMinutes: 50,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Seed 1 session for sibling Topic B (60m)
      focusSessionsStore.push({
        _id: new Types.ObjectId(),
        userId: testUserId,
        workMinutes: 25,
        breakMinutes: 5,
        longBreakMinutes: 15,
        longBreakInterval: 4,
        currentCycle: 3,
        currentPhase: "work",
        linkedType: "topic",
        linkedId: topicBId,
        status: "completed",
        startedAt: new Date(),
        completedAt: new Date(),
        accumulatedWorkSeconds: 3600,
        totalFocusMinutes: 60,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Query Topic A focus-time
      const resA = await request(app).get(`/api/v1/study/topics/${topicAId}/focus-time`);
      expect(resA.status).toBe(200);
      expect(resA.body.topicId).toBe(topicAId);
      expect(resA.body.totalFocusMinutes).toBe(75); // 25 + 50, does NOT include Topic B's 60
      expect(resA.body.sessionCount).toBe(2);
      expect(resA.body.completedCount).toBe(2);
      expect(resA.body.abandonedCount).toBe(0);

      // Query Topic B focus-time
      const resB = await request(app).get(`/api/v1/study/topics/${topicBId}/focus-time`);
      expect(resB.status).toBe(200);
      expect(resB.body.topicId).toBe(topicBId);
      expect(resB.body.totalFocusMinutes).toBe(60);
      expect(resB.body.sessionCount).toBe(1);
    });

    it("surfaces combined topic details with plan events, focus sessions, and flashcard metrics without cross-contamination", async () => {
      // Create Subject & Topic
      const subj = await request(app)
        .post("/api/v1/study/subjects")
        .send({ name: "Algorithms" });
      const subjectId = subj.body.subject.id;

      const topRes = await request(app)
        .post("/api/v1/study/topics")
        .send({ subjectId, title: "Graph Theory" });
      const topicId = topRes.body.topic.id;

      // Seed 2 Flashcards for this Topic
      await request(app)
        .post("/api/v1/study/flashcards")
        .send({ subjectId, topicId, front: "What is Dijkstra's algorithm?", back: "Shortest path in weighted graph" });

      await request(app)
        .post("/api/v1/study/flashcards")
        .send({ subjectId, topicId, front: "What is A* search?", back: "Heuristic search algorithm" });

      // Seed a focus session linked to this topic
      focusSessionsStore.push({
        _id: new Types.ObjectId(),
        userId: testUserId,
        workMinutes: 25,
        breakMinutes: 5,
        longBreakMinutes: 15,
        longBreakInterval: 4,
        currentCycle: 1,
        currentPhase: "work",
        linkedType: "topic",
        linkedId: topicId,
        status: "completed",
        startedAt: new Date(),
        completedAt: new Date(),
        accumulatedWorkSeconds: 1500,
        totalFocusMinutes: 25,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Seed an AI-generated study plan event linked to this topic
      eventsStore.push({
        _id: new Types.ObjectId(),
        userId: testUserId,
        title: "Study: Graph Theory",
        startTime: new Date("2026-08-30T10:00:00.000Z"),
        endTime: new Date("2026-08-30T11:30:00.000Z"),
        linkedTopicId: new Types.ObjectId(topicId),
        status: "scheduled"
      });

      // Request enriched topic details
      const detailRes = await request(app).get(`/api/v1/study/topics/${topicId}`);

      expect(detailRes.status).toBe(200);
      expect(detailRes.body.topic.id).toBe(topicId);
      expect(detailRes.body.topic.title).toBe("Graph Theory");

      // Flashcards
      expect(detailRes.body.flashcards).toHaveLength(2);
      expect(detailRes.body.flashcardStats.total).toBe(2);

      // Focus Time
      expect(detailRes.body.focusTime.totalFocusMinutes).toBe(25);
      expect(detailRes.body.focusTime.sessionCount).toBe(1);
      expect(detailRes.body.focusSessions).toHaveLength(1);
      expect(detailRes.body.focusSessions[0].totalFocusMinutes).toBe(25);

      // Plan Events
      expect(detailRes.body.planEvents).toHaveLength(1);
      expect(detailRes.body.planEvents[0].title).toBe("Study: Graph Theory");
    });
  });
});

