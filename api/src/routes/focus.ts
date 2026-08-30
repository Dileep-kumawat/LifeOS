import { Router, type Request, type Response } from "express";
import { isValidObjectId, type FilterQuery } from "mongoose";
import {
  createFocusSessionSchema,
  focusSessionParamsSchema,
  listFocusSessionsQuerySchema,
  focusSummaryQuerySchema,
  intervalCompleteSchema,
  type FocusPhase,
  type FocusLinkedType
} from "@lifeos/shared";
import { FocusSession, type FocusSessionDoc } from "../models/FocusSession.js";
import { User } from "../models/User.js";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  accumulatePendingWork,
  getNextPhaseAndCycle,
  sendFocusIntervalNotification
} from "../services/focus/focusService.js";

export const focusRouter = Router();

focusRouter.use(requireAuth);

function formatFocusSession(doc: any) {
  return {
    id: doc._id.toString(),
    userId: doc.userId.toString(),
    workMinutes: doc.workMinutes,
    breakMinutes: doc.breakMinutes,
    longBreakMinutes: doc.longBreakMinutes,
    longBreakInterval: doc.longBreakInterval,
    currentCycle: doc.currentCycle,
    currentPhase: doc.currentPhase,
    linkedType: doc.linkedType,
    linkedId: doc.linkedId ?? null,
    status: doc.status,
    startedAt: doc.startedAt instanceof Date ? doc.startedAt.toISOString() : doc.startedAt,
    completedAt: doc.completedAt ? (doc.completedAt instanceof Date ? doc.completedAt.toISOString() : doc.completedAt) : null,
    pausedAt: doc.pausedAt ? (doc.pausedAt instanceof Date ? doc.pausedAt.toISOString() : doc.pausedAt) : null,
    lastResumedAt: doc.lastResumedAt ? (doc.lastResumedAt instanceof Date ? doc.lastResumedAt.toISOString() : doc.lastResumedAt) : null,
    totalFocusMinutes: doc.totalFocusMinutes ?? 0,
    accumulatedWorkSeconds: doc.accumulatedWorkSeconds ?? 0,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : (doc.createdAt ?? new Date().toISOString()),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : (doc.updatedAt ?? new Date().toISOString())
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FOCUS SESSIONS REST API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @openapi
 * /focus/summary:
 *   get:
 *     tags: [Focus]
 *     summary: Aggregated focus time summary and trend (FR-7.4, FR-8.3)
 *     description: |
 *       Returns aggregate focus minutes, completion metrics, and category breakdown by linked item type
 *       (Topic vs. Goal vs. Task vs. Unlinked), accompanied by a sequential time-series trend dataset.
 *       
 *       **API Convention Note (borrowed from Phase 4 Finance):**
 *       Reuses the `month`, `months`, `range`, and `startDate`/`endDate` query parameter conventions established
 *       in Phase 4's Finance summary endpoints.
 *       
 *       **Downstream Analytics Integration (Phase 9):**
 *       This endpoint provides high-performance MongoDB server-side aggregation pipelines specifically structured
 *       to feed the unified Phase 9 cross-domain LifeOS analytics and productivity dashboard.
 *     parameters:
 *       - in: query
 *         name: range
 *         schema: { type: string, enum: [day, week, month] }
 *         description: Preset range ("day" = today, "week" = past 7 days, "month" = current calendar month)
 *       - in: query
 *         name: month
 *         schema: { type: string, example: "2026-08" }
 *         description: Target month in YYYY-MM format (overrides range preset)
 *       - in: query
 *         name: months
 *         schema: { type: integer, default: 6, minimum: 1, maximum: 24 }
 *         description: Number of months to include for multi-month trend analysis
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date-time }
 *         description: Explicit ISO start timestamp boundary
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date-time }
 *         description: Explicit ISO end timestamp boundary
 *     responses:
 *       200:
 *         description: Aggregated focus summary and trend data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 period:
 *                   type: object
 *                   properties:
 *                     range: { type: string, enum: [day, week, month] }
 *                     startDate: { type: string, format: date-time }
 *                     endDate: { type: string, format: date-time }
 *                     label: { type: string, example: "Last 7 Days" }
 *                 totalFocusMinutes: { type: number, example: 320 }
 *                 totalSessionsCount: { type: integer, example: 14 }
 *                 completedSessionsCount: { type: integer, example: 11 }
 *                 abandonedSessionsCount: { type: integer, example: 3 }
 *                 activeSessionsCount: { type: integer, example: 0 }
 *                 averageSessionMinutes: { type: number, example: 22.8 }
 *                 linkedTypeBreakdown:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       linkedType: { type: string, enum: [topic, goal, task, none] }
 *                       totalMinutes: { type: number, example: 180 }
 *                       count: { type: integer, example: 7 }
 *                       percentage: { type: number, example: 56 }
 *                 trend:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date: { type: string, example: "2026-08-28" }
 *                       totalMinutes: { type: number, example: 50 }
 *                       count: { type: integer, example: 2 }
 *                       completedCount: { type: integer, example: 2 }
 *                       abandonedCount: { type: integer, example: 0 }
 *       401:
 *         description: Authentication required
 */
focusRouter.get(
  "/focus/summary",
  validate(focusSummaryQuerySchema, "query"),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!._id;
      const { range, month, startDate, endDate } = req.query as any;


      const now = new Date();
      let startBound: Date;
      let endBound: Date;
      let periodLabel = "Last 7 Days";
      let effectiveRange: "day" | "week" | "month" | undefined = range;

      if (startDate && endDate) {
        startBound = new Date(startDate);
        endBound = new Date(endDate);
        periodLabel = `${startBound.toISOString().split("T")[0]} to ${endBound.toISOString().split("T")[0]}`;
        effectiveRange = undefined;
      } else if (month) {
        const [y, m] = month.split("-").map(Number);
        const targetYear = y;
        const targetMonth = m - 1; // 0-indexed
        startBound = new Date(Date.UTC(targetYear, targetMonth, 1, 0, 0, 0, 0));
        endBound = new Date(Date.UTC(targetYear, targetMonth + 1, 0, 23, 59, 59, 999));
        periodLabel = month;
        effectiveRange = "month";
      } else if (range === "day") {
        startBound = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
        endBound = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
        periodLabel = "Today";
        effectiveRange = "day";
      } else if (range === "month") {
        startBound = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
        endBound = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
        periodLabel = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
        effectiveRange = "month";
      } else {
        // Default: Past 7 days (including today)
        effectiveRange = "week";
        periodLabel = "Last 7 Days";
        endBound = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
        const past7 = new Date(endBound);
        past7.setUTCDate(past7.getUTCDate() - 6);
        startBound = new Date(Date.UTC(past7.getUTCFullYear(), past7.getUTCMonth(), past7.getUTCDate(), 0, 0, 0, 0));
      }

      const overallMatch = {
        userId,
        startedAt: { $gte: startBound, $lte: endBound }
      };

      // 1. Aggregation for overall totals and status counts
      const statsAggregation = await FocusSession.aggregate([
        { $match: overallMatch },
        {
          $group: {
            _id: null,
            totalFocusMinutes: { $sum: "$totalFocusMinutes" },
            totalSessionsCount: { $sum: 1 },
            completedSessionsCount: {
              $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
            },
            abandonedSessionsCount: {
              $sum: { $cond: [{ $eq: ["$status", "abandoned"] }, 1, 0] }
            },
            activeSessionsCount: {
              $sum: { $cond: [{ $in: ["$status", ["active", "paused"]] }, 1, 0] }
            }
          }
        }
      ]);

      const stats = statsAggregation[0] || {
        totalFocusMinutes: 0,
        totalSessionsCount: 0,
        completedSessionsCount: 0,
        abandonedSessionsCount: 0,
        activeSessionsCount: 0
      };

      const totalFocusMinutes = stats.totalFocusMinutes || 0;
      const totalSessionsCount = stats.totalSessionsCount || 0;
      const averageSessionMinutes =
        totalSessionsCount > 0 ? Number((totalFocusMinutes / totalSessionsCount).toFixed(1)) : 0;

      // 2. Aggregation for linkedType breakdown
      const linkedTypeAggregation = await FocusSession.aggregate([
        { $match: overallMatch },
        {
          $group: {
            _id: "$linkedType",
            totalMinutes: { $sum: "$totalFocusMinutes" },
            count: { $sum: 1 }
          }
        },
        { $sort: { totalMinutes: -1 } }
      ]);

      const allLinkedTypes: FocusLinkedType[] = ["topic", "goal", "task", "none"];
      const linkedMap = new Map<FocusLinkedType, { totalMinutes: number; count: number }>();
      for (const t of allLinkedTypes) {
        linkedMap.set(t, { totalMinutes: 0, count: 0 });
      }

      for (const item of linkedTypeAggregation) {
        const t = item._id as FocusLinkedType;
        if (linkedMap.has(t)) {
          linkedMap.set(t, {
            totalMinutes: item.totalMinutes,
            count: item.count
          });
        }
      }

      const linkedTypeBreakdown = Array.from(linkedMap.entries()).map(([linkedType, val]) => ({
        linkedType,
        totalMinutes: val.totalMinutes,
        count: val.count,
        percentage: totalFocusMinutes > 0 ? Math.round((val.totalMinutes / totalFocusMinutes) * 100) : 0
      }));

      // 3. Aggregation for daily trend with zero-filling
      const trendAggregation = await FocusSession.aggregate([
        { $match: overallMatch },
        {
          $group: {
            _id: {
              dateKey: { $dateToString: { format: "%Y-%m-%d", date: "$startedAt" } }
            },
            totalMinutes: { $sum: "$totalFocusMinutes" },
            count: { $sum: 1 },
            completedCount: {
              $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
            },
            abandonedCount: {
              $sum: { $cond: [{ $eq: ["$status", "abandoned"] }, 1, 0] }
            }
          }
        },
        { $sort: { "_id.dateKey": 1 } }
      ]);

      const trendMap = new Map<
        string,
        { totalMinutes: number; count: number; completedCount: number; abandonedCount: number }
      >();

      // Generate sequential date keys across the entire interval
      const cursor = new Date(startBound);
      while (cursor <= endBound) {
        const dateKey = cursor.toISOString().split("T")[0];
        trendMap.set(dateKey, {
          totalMinutes: 0,
          count: 0,
          completedCount: 0,
          abandonedCount: 0
        });
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }

      for (const item of trendAggregation) {
        const key = item._id.dateKey;
        if (trendMap.has(key)) {
          trendMap.set(key, {
            totalMinutes: item.totalMinutes,
            count: item.count,
            completedCount: item.completedCount,
            abandonedCount: item.abandonedCount
          });
        }
      }

      const trend = Array.from(trendMap.entries()).map(([date, vals]) => ({
        date,
        totalMinutes: vals.totalMinutes,
        count: vals.count,
        completedCount: vals.completedCount,
        abandonedCount: vals.abandonedCount
      }));

      return res.status(200).json({
        period: {
          range: effectiveRange,
          startDate: startBound.toISOString(),
          endDate: endBound.toISOString(),
          label: periodLabel
        },
        totalFocusMinutes,
        totalSessionsCount,
        completedSessionsCount: stats.completedSessionsCount || 0,
        abandonedSessionsCount: stats.abandonedSessionsCount || 0,
        activeSessionsCount: stats.activeSessionsCount || 0,
        averageSessionMinutes,
        linkedTypeBreakdown,
        trend
      });
    } catch (err: any) {
      return res.status(500).json({
        error: "InternalServerError",
        message: err.message || "Failed to generate focus summary"
      });
    }
  }
);


// ─────────────────────────────────────────────────────────────────────────────
// FOCUS SESSIONS REST API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @openapi
 * /focus/sessions:
 *   post:
 *     tags: [Focus]
 *     summary: Start a new Pomodoro focus session (FR-8.1)
 *     description: Creates and activates a new Pomodoro focus session. Supports customizable work/break/long-break durations, long break intervals (default 4th cycle), and polymorphic linking to Tasks, Goals, or Study Topics.
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               workMinutes: { type: number, default: 25, example: 25 }
 *               breakMinutes: { type: number, default: 5, example: 5 }
 *               longBreakMinutes: { type: number, default: 15, example: 15 }
 *               longBreakInterval: { type: number, default: 4, example: 4 }
 *               linkedType: { type: string, enum: [task, goal, topic, none], default: none, example: "topic" }
 *               linkedId: { type: string, nullable: true, example: "662c9f1e9f0b2a001c3d4e80" }
 *               dndDuringFocus: { type: boolean, default: false, example: true }
 *     responses:
 *       201:
 *         description: Focus session started successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 */
focusRouter.post(
  "/focus/sessions",
  validate(createFocusSessionSchema),
  async (req: Request, res: Response) => {
    const userId = req.user!._id;
    const body = req.body;

    // Optional DND preference update if requested at start
    if (typeof body.dndDuringFocus === "boolean") {
      await User.updateOne(
        { _id: userId },
        { $set: { "notificationPreferences.dndDuringFocus": body.dndDuringFocus } }
      );
    }

    const now = new Date();
    const session = await FocusSession.create({
      userId,
      workMinutes: body.workMinutes ?? 25,
      breakMinutes: body.breakMinutes ?? 5,
      longBreakMinutes: body.longBreakMinutes ?? 15,
      longBreakInterval: body.longBreakInterval ?? 4,
      currentCycle: 1,
      currentPhase: "work",
      linkedType: body.linkedType ?? "none",
      linkedId: body.linkedId ?? null,
      status: "active",
      startedAt: now,
      lastResumedAt: now,
      pausedAt: null,
      completedAt: null,
      accumulatedWorkSeconds: 0,
      totalFocusMinutes: 0
    });

    return res.status(201).json({
      message: "Focus session started",
      session: formatFocusSession(session)
    });
  }
);

/**
 * @openapi
 * /focus/sessions/active:
 *   get:
 *     tags: [Focus]
 *     summary: Get currently active or paused focus session
 *     description: Retrieves the caller's currently running or paused focus session, enabling instant state restoration across page reloads and mobile reconnects.
 *     responses:
 *       200:
 *         description: Current session or null
 *       401:
 *         description: Authentication required
 */
focusRouter.get("/focus/sessions/active", async (req: Request, res: Response) => {
  const userId = req.user!._id;

  const session = await FocusSession.findOne({
    userId,
    status: { $in: ["active", "paused"] }
  }).sort({ startedAt: -1 });

  return res.json({
    session: session ? formatFocusSession(session) : null
  });
});

/**
 * @openapi
 * /focus/sessions:
 *   get:
 *     tags: [Focus]
 *     summary: List focus session history
 *     description: Retrieves paginated historical focus sessions with optional filtering by date range, status, and polymorphic linked items (e.g. all sessions linked to a specific Study Topic or Goal).
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date-time }
 *         description: Filter sessions started on or after this ISO date-time
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date-time }
 *         description: Filter sessions started on or before this ISO date-time
 *       - in: query
 *         name: linkedType
 *         schema: { type: string, enum: [task, goal, topic, none] }
 *         description: Filter by linked entity type
 *       - in: query
 *         name: linkedId
 *         schema: { type: string }
 *         description: Filter by linked entity ID
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, paused, completed, abandoned] }
 *         description: Filter by session status
 *       - in: query
 *         name: page
 *         schema: { type: number, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: number, default: 20, maximum: 100 }
 *     responses:
 *       200:
 *         description: Paginated focus session history
 *       401:
 *         description: Authentication required
 */
focusRouter.get(
  "/focus/sessions",
  validate(listFocusSessionsQuerySchema, "query"),
  async (req: Request, res: Response) => {
    const userId = req.user!._id;
    const { startDate, endDate, linkedType, linkedId, status, page = 1, limit = 20 } = req.query as any;

    const filter: FilterQuery<FocusSessionDoc> = { userId };

    if (status) {
      filter.status = status;
    }

    if (linkedType) {
      filter.linkedType = linkedType;
    }

    if (linkedId) {
      filter.linkedId = linkedId;
    }

    if (startDate || endDate) {
      filter.startedAt = {};
      if (startDate) filter.startedAt.$gte = new Date(startDate);
      if (endDate) filter.startedAt.$lte = new Date(endDate);
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(100, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const total = await FocusSession.countDocuments(filter);
    const docs = await FocusSession.find(filter)
      .sort({ startedAt: -1 })
      .skip(skip)
      .limit(limitNum);

    return res.json({
      sessions: docs.map(formatFocusSession),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  }
);

/**
 * @openapi
 * /focus/sessions/{id}:
 *   get:
 *     tags: [Focus]
 *     summary: Get single focus session details
 *     description: Returns details of a specific focus session.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Focus session details
 *       404:
 *         description: Session not found
 */
focusRouter.get(
  "/focus/sessions/:id",
  validate(focusSessionParamsSchema, "params"),
  async (req: Request, res: Response) => {
    const userId = req.user!._id;
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(404).json({ error: "Focus session not found" });
    }

    const session = await FocusSession.findOne({ _id: id, userId });
    if (!session) {
      return res.status(404).json({ error: "Focus session not found" });
    }

    return res.json({ session: formatFocusSession(session) });
  }
);

/**
 * @openapi
 * /focus/sessions/{id}/pause:
 *   patch:
 *     tags: [Focus]
 *     summary: Pause an active focus session
 *     description: |
 *       Pauses an active focus session. Accurately accumulates elapsed work time into `totalFocusMinutes`
 *       and `accumulatedWorkSeconds` up to the exact moment of pausing (`now - lastResumedAt`), and sets
 *       `lastResumedAt = null`. This ensures paused gaps are strictly excluded from logged focus time.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Focus session paused successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Focus session paused" }
 *                 session:
 *                   type: object
 *                   properties:
 *                     id: { type: string, example: "662c9f1e9f0b2a001c3d4e80" }
 *                     userId: { type: string, example: "662c9f1e9f0b2a001c3d4e0a" }
 *                     status: { type: string, example: "paused" }
 *                     currentPhase: { type: string, example: "work" }
 *                     currentCycle: { type: integer, example: 1 }
 *                     totalFocusMinutes: { type: number, example: 15 }
 *                     accumulatedWorkSeconds: { type: number, example: 900 }
 *                     pausedAt: { type: string, format: date-time, example: "2026-08-30T09:15:00.000Z" }
 *                     lastResumedAt: { type: string, nullable: true, example: null }
 *       400:
 *         description: Session is not in active state
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Focus session not found
 */
focusRouter.patch(
  "/focus/sessions/:id/pause",
  validate(focusSessionParamsSchema, "params"),
  async (req: Request, res: Response) => {
    const userId = req.user!._id;
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(404).json({ error: "Focus session not found" });
    }

    const session = await FocusSession.findOne({ _id: id, userId });
    if (!session) {
      return res.status(404).json({ error: "Focus session not found" });
    }

    if (session.status !== "active") {
      return res.status(400).json({ error: `Cannot pause session in status '${session.status}'` });
    }

    const now = new Date();
    const updatedWork = accumulatePendingWork(session, now);

    session.accumulatedWorkSeconds = updatedWork.accumulatedWorkSeconds;
    session.totalFocusMinutes = updatedWork.totalFocusMinutes;
    session.status = "paused";
    session.pausedAt = now;
    session.lastResumedAt = null;

    await session.save();

    return res.json({
      message: "Focus session paused",
      session: formatFocusSession(session)
    });
  }
);

/**
 * @openapi
 * /focus/sessions/{id}/resume:
 *   patch:
 *     tags: [Focus]
 *     summary: Resume a paused focus session
 *     description: Resumes a paused focus session. Resets the active work baseline timestamp (lastResumedAt) to now, ensuring paused downtime is completely excluded from totalFocusMinutes.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Focus session resumed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Focus session resumed" }
 *                 session:
 *                   type: object
 *                   properties:
 *                     id: { type: string, example: "662c9f1e9f0b2a001c3d4e80" }
 *                     status: { type: string, example: "active" }
 *                     lastResumedAt: { type: string, format: date-time, example: "2026-08-30T09:20:00.000Z" }
 *       400:
 *         description: Session is not paused
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Focus session not found
 */
focusRouter.patch(
  "/focus/sessions/:id/resume",
  validate(focusSessionParamsSchema, "params"),
  async (req: Request, res: Response) => {
    const userId = req.user!._id;
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(404).json({ error: "Focus session not found" });
    }

    const session = await FocusSession.findOne({ _id: id, userId });
    if (!session) {
      return res.status(404).json({ error: "Focus session not found" });
    }

    if (session.status !== "paused") {
      return res.status(400).json({ error: `Cannot resume session in status '${session.status}'` });
    }

    const now = new Date();
    session.status = "active";
    session.pausedAt = null;
    session.lastResumedAt = now;

    await session.save();

    return res.json({
      message: "Focus session resumed",
      session: formatFocusSession(session)
    });
  }
);

/**
 * @openapi
 * /focus/sessions/{id}/complete:
 *   patch:
 *     tags: [Focus]
 *     summary: Mark focus session completed
 *     description: Finalizes an active or paused focus session, accumulating any remaining active work seconds and recording the completion timestamp.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Focus session completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Focus session completed" }
 *                 session:
 *                   type: object
 *                   properties:
 *                     id: { type: string, example: "662c9f1e9f0b2a001c3d4e80" }
 *                     status: { type: string, example: "completed" }
 *                     totalFocusMinutes: { type: number, example: 50 }
 *                     completedAt: { type: string, format: date-time, example: "2026-08-30T10:00:00.000Z" }
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Focus session not found
 */
focusRouter.patch(
  "/focus/sessions/:id/complete",
  validate(focusSessionParamsSchema, "params"),
  async (req: Request, res: Response) => {
    const userId = req.user!._id;
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(404).json({ error: "Focus session not found" });
    }

    const session = await FocusSession.findOne({ _id: id, userId });
    if (!session) {
      return res.status(404).json({ error: "Focus session not found" });
    }

    const now = new Date();
    const updatedWork = accumulatePendingWork(session, now);

    session.accumulatedWorkSeconds = updatedWork.accumulatedWorkSeconds;
    session.totalFocusMinutes = updatedWork.totalFocusMinutes;
    session.status = "completed";
    session.completedAt = now;
    session.lastResumedAt = null;

    await session.save();

    return res.json({
      message: "Focus session completed",
      session: formatFocusSession(session)
    });
  }
);

/**
 * @openapi
 * /focus/sessions/{id}/abandon:
 *   patch:
 *     tags: [Focus]
 *     summary: Abandon focus session early
 *     description: Marks a focus session abandoned (e.g. user stopped early). Crucially preserves all partial focus time accumulated up to the abandon point in totalFocusMinutes rather than discarding it.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Focus session abandoned with partial time preserved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Focus session abandoned" }
 *                 session:
 *                   type: object
 *                   properties:
 *                     id: { type: string, example: "662c9f1e9f0b2a001c3d4e80" }
 *                     status: { type: string, example: "abandoned" }
 *                     totalFocusMinutes: { type: number, example: 18 }
 *                     completedAt: { type: string, format: date-time, example: "2026-08-30T09:18:00.000Z" }
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Focus session not found
 */
focusRouter.patch(
  "/focus/sessions/:id/abandon",
  validate(focusSessionParamsSchema, "params"),
  async (req: Request, res: Response) => {
    const userId = req.user!._id;
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(404).json({ error: "Focus session not found" });
    }

    const session = await FocusSession.findOne({ _id: id, userId });
    if (!session) {
      return res.status(404).json({ error: "Focus session not found" });
    }

    const now = new Date();
    const updatedWork = accumulatePendingWork(session, now);

    session.accumulatedWorkSeconds = updatedWork.accumulatedWorkSeconds;
    session.totalFocusMinutes = updatedWork.totalFocusMinutes;
    session.status = "abandoned";
    session.completedAt = now;
    session.lastResumedAt = null;

    await session.save();

    return res.json({
      message: "Focus session abandoned",
      session: formatFocusSession(session)
    });
  }
);

/**
 * @openapi
 * /focus/sessions/{id}/interval-complete:
 *   post:
 *     tags: [Focus]
 *     summary: Client-timed Pomodoro interval completion transition (FR-8.2)
 *     description: |
 *       Called by the client countdown when an interval completes (work -> break or break -> work).
 *       Accumulates focus work time, advances cycle/phase, and immediately enqueues interval completion
 *       alerts via Phase 2 notification infrastructure (respecting `focusSessionAlerts` preference and DND mode).
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [completedPhase]
 *             properties:
 *               completedPhase: { type: string, enum: [work, break, long_break], example: "work" }
 *               nextPhase: { type: string, enum: [work, break, long_break], example: "break" }
 *               cycle: { type: number, example: 1 }
 *     responses:
 *       200:
 *         description: Interval transitioned and notification enqueued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Interval completed successfully" }
 *                 session:
 *                   type: object
 *                   properties:
 *                     id: { type: string, example: "662c9f1e9f0b2a001c3d4e80" }
 *                     currentPhase: { type: string, enum: [work, break, long_break], example: "break" }
 *                     currentCycle: { type: integer, example: 1 }
 *                     totalFocusMinutes: { type: number, example: 25 }
 *                     accumulatedWorkSeconds: { type: number, example: 1500 }
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Focus session not found
 */
focusRouter.post(
  "/focus/sessions/:id/interval-complete",
  validate(focusSessionParamsSchema, "params"),
  validate(intervalCompleteSchema),
  async (req: Request, res: Response) => {
    const userId = req.user!._id;
    const { id } = req.params;
    const { completedPhase, nextPhase: explicitNextPhase, cycle: explicitCycle } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(404).json({ error: "Focus session not found" });
    }

    const session = await FocusSession.findOne({ _id: id, userId });
    if (!session) {
      return res.status(404).json({ error: "Focus session not found" });
    }

    const now = new Date();

    // If previous phase was work, accumulate elapsed work time
    if (session.currentPhase === "work" || completedPhase === "work") {
      const updatedWork = accumulatePendingWork(session, now);
      session.accumulatedWorkSeconds = updatedWork.accumulatedWorkSeconds;
      session.totalFocusMinutes = updatedWork.totalFocusMinutes;
    }

    // Determine next phase and cycle progression
    const progression = getNextPhaseAndCycle(
      completedPhase as FocusPhase,
      explicitCycle ?? session.currentCycle,
      session.longBreakInterval ?? 4
    );

    const targetNextPhase = (explicitNextPhase as FocusPhase) || progression.nextPhase;
    const targetNextCycle = explicitCycle ?? progression.nextCycle;

    session.currentPhase = targetNextPhase;
    session.currentCycle = targetNextCycle;
    session.lastResumedAt = now;
    session.pausedAt = null;

    await session.save();

    // Enqueue Phase 2 interval alert (reusing Phase 2 notification engine)
    await sendFocusIntervalNotification(session, completedPhase as FocusPhase, targetNextPhase);

    return res.json({
      message: "Interval completed successfully",
      session: formatFocusSession(session)
    });
  }
);
