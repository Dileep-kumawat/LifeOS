import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { Types } from "mongoose";

const testUserId = new Types.ObjectId("662c9f1e9f0b2a001c3d4e0a");

// Mock auth middleware
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

// Mock focus notifications
vi.mock("../../services/focus/focusService.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/focus/focusService.js")>();
  return {
    ...actual,
    sendFocusIntervalNotification: vi.fn().mockResolvedValue(undefined)
  };
});

interface MockFocusSession {
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
  pausedAt: Date | null;
  lastResumedAt: Date | null;
  accumulatedWorkSeconds: number;
  totalFocusMinutes: number;
  createdAt: Date;
  updatedAt: Date;
  save: () => Promise<MockFocusSession>;
}

let sessionsStore: MockFocusSession[] = [];

function createMockQuery<T>(results: T[]) {
  const promise = Promise.resolve(results);
  return {
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockImplementation((limitNum: number) => Promise.resolve(results.slice(0, limitNum)))
  };
}

vi.mock("../../models/FocusSession.js", () => {
  return {
    FocusSession: {
      create: vi.fn().mockImplementation(async (data: Partial<MockFocusSession>) => {
        const now = new Date();
        const doc: MockFocusSession = {
          _id: new Types.ObjectId(),
          userId: data.userId || testUserId,
          workMinutes: data.workMinutes ?? 25,
          breakMinutes: data.breakMinutes ?? 5,
          longBreakMinutes: data.longBreakMinutes ?? 15,
          longBreakInterval: data.longBreakInterval ?? 4,
          currentCycle: data.currentCycle ?? 1,
          currentPhase: data.currentPhase ?? "work",
          linkedType: data.linkedType ?? "none",
          linkedId: data.linkedId ?? null,
          status: data.status ?? "active",
          startedAt: data.startedAt ?? now,
          completedAt: data.completedAt ?? null,
          pausedAt: data.pausedAt ?? null,
          lastResumedAt: data.lastResumedAt ?? now,
          accumulatedWorkSeconds: data.accumulatedWorkSeconds ?? 0,
          totalFocusMinutes: data.totalFocusMinutes ?? 0,
          createdAt: now,
          updatedAt: now,
          save: async function () {
            this.updatedAt = new Date();
            return this;
          }
        };
        sessionsStore.push(doc);
        return doc;
      }),
      findOne: vi.fn().mockImplementation((filter: any) => {
        let results = sessionsStore.filter((s) => {
          if (filter.userId && !s.userId.equals(filter.userId)) return false;
          if (filter._id && !s._id.equals(filter._id)) return false;
          if (filter.status && filter.status.$in) {
            return filter.status.$in.includes(s.status);
          }
          if (filter.status && s.status !== filter.status) return false;
          return true;
        });
        const match = results[0] || null;
        const promise = Promise.resolve(match);
        return {
          then: promise.then.bind(promise),
          catch: promise.catch.bind(promise),
          sort: vi.fn().mockReturnThis()
        };
      }),
      find: vi.fn().mockImplementation((filter: any) => {
        let results = sessionsStore.filter((s) => {
          if (filter.userId && !s.userId.equals(filter.userId)) return false;
          if (filter.status && s.status !== filter.status) return false;
          if (filter.linkedType && s.linkedType !== filter.linkedType) return false;
          if (filter.linkedId && s.linkedId !== filter.linkedId) return false;
          return true;
        });
        return createMockQuery(results);
      }),
      countDocuments: vi.fn().mockImplementation((filter: any) => {
        let results = sessionsStore.filter((s) => {
          if (filter.userId && !s.userId.equals(filter.userId)) return false;
          if (filter.status && s.status !== filter.status) return false;
          return true;
        });
        return Promise.resolve(results.length);
      })
    }
  };
});

vi.mock("../../models/User.js", () => ({
  User: {
    updateOne: vi.fn().mockResolvedValue({ acknowledged: true })
  }
}));

import { focusRouter } from "../focus.js";
import { sendFocusIntervalNotification } from "../../services/focus/focusService.js";

const app = express();
app.use(express.json());
app.use(focusRouter);

describe("Focus Timer API (/api/v1/focus)", () => {
  beforeEach(() => {
    sessionsStore = [];
    vi.clearAllMocks();
  });

  describe("1. POST /focus/sessions (Start Session)", () => {
    it("starts a default 25-minute Pomodoro session with no links", async () => {
      const res = await request(app)
        .post("/focus/sessions")
        .send({});

      expect(res.status).toBe(201);
      expect(res.body.session).toBeDefined();
      expect(res.body.session.workMinutes).toBe(25);
      expect(res.body.session.breakMinutes).toBe(5);
      expect(res.body.session.longBreakMinutes).toBe(15);
      expect(res.body.session.status).toBe("active");
      expect(res.body.session.currentPhase).toBe("work");
      expect(res.body.session.currentCycle).toBe(1);
      expect(res.body.session.totalFocusMinutes).toBe(0);
    });

    it("starts a session linked to a Study Topic with custom intervals", async () => {
      const res = await request(app)
        .post("/focus/sessions")
        .send({
          workMinutes: 50,
          breakMinutes: 10,
          longBreakMinutes: 20,
          linkedType: "topic",
          linkedId: "662c9f1e9f0b2a001c3d4e80",
          dndDuringFocus: true
        });

      expect(res.status).toBe(201);
      expect(res.body.session.workMinutes).toBe(50);
      expect(res.body.session.breakMinutes).toBe(10);
      expect(res.body.session.linkedType).toBe("topic");
      expect(res.body.session.linkedId).toBe("662c9f1e9f0b2a001c3d4e80");
    });
  });

  describe("2. Pause and Resume Time Accumulation Semantics", () => {
    it("correctly accumulates active work seconds on pause and excludes paused duration on resume", async () => {
      // 1. Create active session started 10 minutes (600s) ago
      const tenMinutesAgo = new Date(Date.now() - 600 * 1000);
      const sessionDoc: MockFocusSession = {
        _id: new Types.ObjectId(),
        userId: testUserId,
        workMinutes: 25,
        breakMinutes: 5,
        longBreakMinutes: 15,
        longBreakInterval: 4,
        currentCycle: 1,
        currentPhase: "work",
        linkedType: "none",
        linkedId: null,
        status: "active",
        startedAt: tenMinutesAgo,
        completedAt: null,
        pausedAt: null,
        lastResumedAt: tenMinutesAgo,
        accumulatedWorkSeconds: 0,
        totalFocusMinutes: 0,
        createdAt: tenMinutesAgo,
        updatedAt: tenMinutesAgo,
        save: async function () { return this; }
      };
      sessionsStore.push(sessionDoc);

      // 2. Pause the session
      const pauseRes = await request(app)
        .patch(`/focus/sessions/${sessionDoc._id.toString()}/pause`)
        .send();

      expect(pauseRes.status).toBe(200);
      expect(pauseRes.body.session.status).toBe("paused");
      expect(pauseRes.body.session.accumulatedWorkSeconds).toBeGreaterThanOrEqual(599);
      expect(pauseRes.body.session.totalFocusMinutes).toBeCloseTo(10, 0);

      // 3. Fast-forward simulated paused time by 5 minutes (300s)
      sessionDoc.pausedAt = new Date(Date.now() - 300 * 1000);

      // 4. Resume the session
      const resumeRes = await request(app)
        .patch(`/focus/sessions/${sessionDoc._id.toString()}/resume`)
        .send();

      expect(resumeRes.status).toBe(200);
      expect(resumeRes.body.session.status).toBe("active");
      // Accumulated work time must remain unchanged (paused duration was not added!)
      expect(resumeRes.body.session.accumulatedWorkSeconds).toBe(pauseRes.body.session.accumulatedWorkSeconds);
      expect(resumeRes.body.session.totalFocusMinutes).toBe(pauseRes.body.session.totalFocusMinutes);
    });
  });

  describe("3. Abandoning vs Completing Sessions", () => {
    it("preserves partial focus time when a session is abandoned early", async () => {
      // 1. Session active for 15 minutes
      const fifteenMinsAgo = new Date(Date.now() - 900 * 1000);
      const sessionDoc: MockFocusSession = {
        _id: new Types.ObjectId(),
        userId: testUserId,
        workMinutes: 25,
        breakMinutes: 5,
        longBreakMinutes: 15,
        longBreakInterval: 4,
        currentCycle: 1,
        currentPhase: "work",
        linkedType: "none",
        linkedId: null,
        status: "active",
        startedAt: fifteenMinsAgo,
        completedAt: null,
        pausedAt: null,
        lastResumedAt: fifteenMinsAgo,
        accumulatedWorkSeconds: 0,
        totalFocusMinutes: 0,
        createdAt: fifteenMinsAgo,
        updatedAt: fifteenMinsAgo,
        save: async function () { return this; }
      };
      sessionsStore.push(sessionDoc);

      // 2. Abandon session early
      const res = await request(app)
        .patch(`/focus/sessions/${sessionDoc._id.toString()}/abandon`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.session.status).toBe("abandoned");
      expect(res.body.session.completedAt).toBeDefined();
      // Partial focus time is preserved!
      expect(res.body.session.accumulatedWorkSeconds).toBeGreaterThanOrEqual(899);
      expect(res.body.session.totalFocusMinutes).toBeCloseTo(15, 0);
    });

    it("finalizes total focus minutes when a session is marked completed", async () => {
      const sessionDoc: MockFocusSession = {
        _id: new Types.ObjectId(),
        userId: testUserId,
        workMinutes: 25,
        breakMinutes: 5,
        longBreakMinutes: 15,
        longBreakInterval: 4,
        currentCycle: 1,
        currentPhase: "work",
        linkedType: "none",
        linkedId: null,
        status: "active",
        startedAt: new Date(),
        completedAt: null,
        pausedAt: null,
        lastResumedAt: new Date(Date.now() - 1500 * 1000), // 25 mins
        accumulatedWorkSeconds: 0,
        totalFocusMinutes: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        save: async function () { return this; }
      };
      sessionsStore.push(sessionDoc);

      const res = await request(app)
        .patch(`/focus/sessions/${sessionDoc._id.toString()}/complete`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.session.status).toBe("completed");
      expect(res.body.session.totalFocusMinutes).toBeCloseTo(25, 0);
    });
  });

  describe("4. Interval Transitions & Phase 2 Notification Enqueue (FR-8.2)", () => {
    it("transitions from work to break on standard cycle and enqueues notification", async () => {
      const sessionDoc: MockFocusSession = {
        _id: new Types.ObjectId(),
        userId: testUserId,
        workMinutes: 25,
        breakMinutes: 5,
        longBreakMinutes: 15,
        longBreakInterval: 4,
        currentCycle: 1,
        currentPhase: "work",
        linkedType: "none",
        linkedId: null,
        status: "active",
        startedAt: new Date(),
        completedAt: null,
        pausedAt: null,
        lastResumedAt: new Date(Date.now() - 1500 * 1000),
        accumulatedWorkSeconds: 0,
        totalFocusMinutes: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        save: async function () { return this; }
      };
      sessionsStore.push(sessionDoc);

      const res = await request(app)
        .post(`/focus/sessions/${sessionDoc._id.toString()}/interval-complete`)
        .send({
          completedPhase: "work"
        });

      expect(res.status).toBe(200);
      expect(res.body.session.currentPhase).toBe("break");
      expect(res.body.session.currentCycle).toBe(1);
      expect(sendFocusIntervalNotification).toHaveBeenCalledWith(
        expect.anything(),
        "work",
        "break"
      );
    });

    it("transitions from work to long_break on 4th cycle", async () => {
      const sessionDoc: MockFocusSession = {
        _id: new Types.ObjectId(),
        userId: testUserId,
        workMinutes: 25,
        breakMinutes: 5,
        longBreakMinutes: 15,
        longBreakInterval: 4,
        currentCycle: 4,
        currentPhase: "work",
        linkedType: "none",
        linkedId: null,
        status: "active",
        startedAt: new Date(),
        completedAt: null,
        pausedAt: null,
        lastResumedAt: new Date(Date.now() - 1500 * 1000),
        accumulatedWorkSeconds: 3 * 25 * 60,
        totalFocusMinutes: 75,
        createdAt: new Date(),
        updatedAt: new Date(),
        save: async function () { return this; }
      };
      sessionsStore.push(sessionDoc);

      const res = await request(app)
        .post(`/focus/sessions/${sessionDoc._id.toString()}/interval-complete`)
        .send({
          completedPhase: "work"
        });

      expect(res.status).toBe(200);
      expect(res.body.session.currentPhase).toBe("long_break");
      expect(res.body.session.currentCycle).toBe(4);
      expect(sendFocusIntervalNotification).toHaveBeenCalledWith(
        expect.anything(),
        "work",
        "long_break"
      );
    });

    it("transitions from break back to work and increments cycle counter", async () => {
      const sessionDoc: MockFocusSession = {
        _id: new Types.ObjectId(),
        userId: testUserId,
        workMinutes: 25,
        breakMinutes: 5,
        longBreakMinutes: 15,
        longBreakInterval: 4,
        currentCycle: 1,
        currentPhase: "break",
        linkedType: "none",
        linkedId: null,
        status: "active",
        startedAt: new Date(),
        completedAt: null,
        pausedAt: null,
        lastResumedAt: new Date(),
        accumulatedWorkSeconds: 25 * 60,
        totalFocusMinutes: 25,
        createdAt: new Date(),
        updatedAt: new Date(),
        save: async function () { return this; }
      };
      sessionsStore.push(sessionDoc);

      const res = await request(app)
        .post(`/focus/sessions/${sessionDoc._id.toString()}/interval-complete`)
        .send({
          completedPhase: "break"
        });

      expect(res.status).toBe(200);
      expect(res.body.session.currentPhase).toBe("work");
      expect(res.body.session.currentCycle).toBe(2);
    });
  });

  describe("5. Querying Sessions & Active State", () => {
    it("returns the active session when one is running", async () => {
      const sessionDoc: MockFocusSession = {
        _id: new Types.ObjectId(),
        userId: testUserId,
        workMinutes: 25,
        breakMinutes: 5,
        longBreakMinutes: 15,
        longBreakInterval: 4,
        currentCycle: 1,
        currentPhase: "work",
        linkedType: "topic",
        linkedId: "topic-123",
        status: "active",
        startedAt: new Date(),
        completedAt: null,
        pausedAt: null,
        lastResumedAt: new Date(),
        accumulatedWorkSeconds: 0,
        totalFocusMinutes: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        save: async function () { return this; }
      };
      sessionsStore.push(sessionDoc);

      const res = await request(app).get("/focus/sessions/active");

      expect(res.status).toBe(200);
      expect(res.body.session).toBeDefined();
      expect(res.body.session.id).toBe(sessionDoc._id.toString());
      expect(res.body.session.linkedId).toBe("topic-123");
    });

    it("returns null when no active session exists", async () => {
      const res = await request(app).get("/focus/sessions/active");

      expect(res.status).toBe(200);
      expect(res.body.session).toBeNull();
    });
  });
});
