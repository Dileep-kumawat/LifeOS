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
      }),
      aggregate: vi.fn().mockImplementation((pipeline: any[]) => {
        let docs = [...sessionsStore];
        for (const stage of pipeline) {
          if (stage.$match) {
            const match = stage.$match;
            docs = docs.filter((s) => {
              if (match.userId && !s.userId.equals(match.userId)) return false;
              if (match.linkedType && s.linkedType !== match.linkedType) return false;
              if (match.linkedId && s.linkedId !== match.linkedId) return false;
              if (match.startedAt) {
                const t = s.startedAt.getTime();
                if (match.startedAt.$gte && t < new Date(match.startedAt.$gte).getTime()) return false;
                if (match.startedAt.$lte && t > new Date(match.startedAt.$lte).getTime()) return false;
              }
              return true;
            });
          } else if (stage.$group) {
            const group = stage.$group;
            if (group._id === null) {
              let totalFocusMinutes = 0;
              let totalSessionsCount = docs.length;
              let completedSessionsCount = 0;
              let abandonedSessionsCount = 0;
              let activeSessionsCount = 0;
              for (const s of docs) {
                totalFocusMinutes += s.totalFocusMinutes || 0;
                if (s.status === "completed") completedSessionsCount++;
                if (s.status === "abandoned") abandonedSessionsCount++;
                if (["active", "paused"].includes(s.status)) activeSessionsCount++;
              }
              return Promise.resolve(
                docs.length > 0
                  ? [
                      {
                        _id: null,
                        totalFocusMinutes,
                        totalSessionsCount,
                        completedSessionsCount,
                        abandonedSessionsCount,
                        activeSessionsCount,
                        sessionCount: totalSessionsCount,
                        completedCount: completedSessionsCount,
                        abandonedCount: abandonedSessionsCount
                      }
                    ]
                  : []
              );
            } else if (group._id === "$linkedType") {
              const groups: Record<string, { totalMinutes: number; count: number }> = {};
              for (const s of docs) {
                const key = s.linkedType || "none";
                if (!groups[key]) groups[key] = { totalMinutes: 0, count: 0 };
                groups[key].totalMinutes += s.totalFocusMinutes || 0;
                groups[key].count += 1;
              }
              return Promise.resolve(
                Object.entries(groups).map(([k, v]) => ({
                  _id: k,
                  totalMinutes: v.totalMinutes,
                  count: v.count
                }))
              );
            } else if (group._id && group._id.dateKey) {
              const groups: Record<
                string,
                { totalMinutes: number; count: number; completedCount: number; abandonedCount: number }
              > = {};
              for (const s of docs) {
                const key = s.startedAt.toISOString().split("T")[0];
                if (!groups[key]) groups[key] = { totalMinutes: 0, count: 0, completedCount: 0, abandonedCount: 0 };
                groups[key].totalMinutes += s.totalFocusMinutes || 0;
                groups[key].count += 1;
                if (s.status === "completed") groups[key].completedCount += 1;
                if (s.status === "abandoned") groups[key].abandonedCount += 1;
              }
              return Promise.resolve(
                Object.entries(groups).map(([k, v]) => ({
                  _id: { dateKey: k },
                  totalMinutes: v.totalMinutes,
                  count: v.count,
                  completedCount: v.completedCount,
                  abandonedCount: v.abandonedCount
                }))
              );
            }
          }
        }
        return Promise.resolve(docs);
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

  describe("6. Aggregated Focus Summary & Trends (FR-7.4, FR-8.3)", () => {
    it("returns empty stats and zero-filled trend when no sessions exist", async () => {
      const res = await request(app).get("/focus/summary?range=week");

      expect(res.status).toBe(200);
      expect(res.body.totalFocusMinutes).toBe(0);
      expect(res.body.totalSessionsCount).toBe(0);
      expect(res.body.completedSessionsCount).toBe(0);
      expect(res.body.abandonedSessionsCount).toBe(0);
      expect(res.body.averageSessionMinutes).toBe(0);
      expect(res.body.linkedTypeBreakdown).toHaveLength(4);
      expect(res.body.trend.length).toBeGreaterThanOrEqual(7);
      expect(res.body.trend.every((t: any) => t.totalMinutes === 0)).toBe(true);
    });

    it("aggregates focus minutes, completion stats, and linkedType breakdown across date ranges", async () => {
      const now = new Date();

      // Session 1: Today, completed, linked to Study Topic, 50 mins
      sessionsStore.push({
        _id: new Types.ObjectId(),
        userId: testUserId,
        workMinutes: 25,
        breakMinutes: 5,
        longBreakMinutes: 15,
        longBreakInterval: 4,
        currentCycle: 2,
        currentPhase: "work",
        linkedType: "topic",
        linkedId: "topic-101",
        status: "completed",
        startedAt: now,
        completedAt: now,
        pausedAt: null,
        lastResumedAt: null,
        accumulatedWorkSeconds: 3000,
        totalFocusMinutes: 50,
        createdAt: now,
        updatedAt: now,
        save: async function () { return this; }
      });

      // Session 2: Today, abandoned with partial time preserved, linked to Goal, 15 mins
      sessionsStore.push({
        _id: new Types.ObjectId(),
        userId: testUserId,
        workMinutes: 25,
        breakMinutes: 5,
        longBreakMinutes: 15,
        longBreakInterval: 4,
        currentCycle: 1,
        currentPhase: "work",
        linkedType: "goal",
        linkedId: "goal-201",
        status: "abandoned",
        startedAt: now,
        completedAt: now,
        pausedAt: null,
        lastResumedAt: null,
        accumulatedWorkSeconds: 900,
        totalFocusMinutes: 15,
        createdAt: now,
        updatedAt: now,
        save: async function () { return this; }
      });

      // Session 3: 2 days ago, completed, unlinked (none), 25 mins
      const twoDaysAgo = new Date(now);
      twoDaysAgo.setUTCDate(twoDaysAgo.getUTCDate() - 2);

      sessionsStore.push({
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
        status: "completed",
        startedAt: twoDaysAgo,
        completedAt: twoDaysAgo,
        pausedAt: null,
        lastResumedAt: null,
        accumulatedWorkSeconds: 1500,
        totalFocusMinutes: 25,
        createdAt: twoDaysAgo,
        updatedAt: twoDaysAgo,
        save: async function () { return this; }
      });

      const res = await request(app).get("/focus/summary?range=week");

      expect(res.status).toBe(200);
      expect(res.body.totalFocusMinutes).toBe(90); // 50 + 15 + 25
      expect(res.body.totalSessionsCount).toBe(3);
      expect(res.body.completedSessionsCount).toBe(2);
      expect(res.body.abandonedSessionsCount).toBe(1);
      expect(res.body.averageSessionMinutes).toBe(30);

      // Verify linkedType breakdown
      const topicItem = res.body.linkedTypeBreakdown.find((b: any) => b.linkedType === "topic");
      const goalItem = res.body.linkedTypeBreakdown.find((b: any) => b.linkedType === "goal");
      const noneItem = res.body.linkedTypeBreakdown.find((b: any) => b.linkedType === "none");

      expect(topicItem).toBeDefined();
      expect(topicItem.totalMinutes).toBe(50);
      expect(topicItem.count).toBe(1);
      expect(topicItem.percentage).toBe(56); // 50/90 = 55.55% -> 56%

      expect(goalItem).toBeDefined();
      expect(goalItem.totalMinutes).toBe(15);
      expect(goalItem.count).toBe(1);
      expect(goalItem.percentage).toBe(17); // 15/90 = 16.66% -> 17%

      expect(noneItem).toBeDefined();
      expect(noneItem.totalMinutes).toBe(25);
      expect(noneItem.count).toBe(1);
      expect(noneItem.percentage).toBe(28); // 25/90 = 27.77% -> 28%

      // Verify daily trend
      const todayKey = now.toISOString().split("T")[0];
      const todayTrend = res.body.trend.find((t: any) => t.date === todayKey);
      expect(todayTrend).toBeDefined();
      expect(todayTrend.totalMinutes).toBe(65); // 50 + 15
      expect(todayTrend.count).toBe(2);
      expect(todayTrend.completedCount).toBe(1);
      expect(todayTrend.abandonedCount).toBe(1);
    });

    it("respects explicit date range filters without boundary leaks", async () => {
      const today = new Date("2026-08-15T12:00:00.000Z");
      const outside = new Date("2026-08-01T12:00:00.000Z");

      sessionsStore.push({
        _id: new Types.ObjectId(),
        userId: testUserId,
        workMinutes: 25,
        breakMinutes: 5,
        longBreakMinutes: 15,
        longBreakInterval: 4,
        currentCycle: 1,
        currentPhase: "work",
        linkedType: "topic",
        linkedId: "topic-101",
        status: "completed",
        startedAt: today,
        completedAt: today,
        pausedAt: null,
        lastResumedAt: null,
        accumulatedWorkSeconds: 1500,
        totalFocusMinutes: 25,
        createdAt: today,
        updatedAt: today,
        save: async function () { return this; }
      });

      sessionsStore.push({
        _id: new Types.ObjectId(),
        userId: testUserId,
        workMinutes: 25,
        breakMinutes: 5,
        longBreakMinutes: 15,
        longBreakInterval: 4,
        currentCycle: 1,
        currentPhase: "work",
        linkedType: "topic",
        linkedId: "topic-101",
        status: "completed",
        startedAt: outside,
        completedAt: outside,
        pausedAt: null,
        lastResumedAt: null,
        accumulatedWorkSeconds: 1500,
        totalFocusMinutes: 25,
        createdAt: outside,
        updatedAt: outside,
        save: async function () { return this; }
      });

      const res = await request(app).get(
        "/focus/summary?startDate=2026-08-10T00:00:00.000Z&endDate=2026-08-20T23:59:59.999Z"
      );

      expect(res.status).toBe(200);
      expect(res.body.totalFocusMinutes).toBe(25);
      expect(res.body.totalSessionsCount).toBe(1);
    });
  });
});

