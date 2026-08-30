import { Router, type Request, type Response } from "express";
import { isValidObjectId, type FilterQuery } from "mongoose";
import {
  createFocusSessionSchema,
  focusSessionParamsSchema,
  listFocusSessionsQuerySchema,
  intervalCompleteSchema,
  type FocusPhase
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
 *     description: Pauses an active focus session. Accurately accumulates elapsed work time into totalFocusMinutes up to the exact moment of pausing, preventing paused gaps from counting toward focus time.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Focus session paused
 *       400:
 *         description: Session is not in active state
 *       404:
 *         description: Session not found
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
 *         description: Focus session resumed
 *       400:
 *         description: Session is not paused
 *       404:
 *         description: Session not found
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
 *       404:
 *         description: Session not found
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
 *       404:
 *         description: Session not found
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
 *     description: Called by the client countdown when an interval completes (work -> break or break -> work). Accumulates focus work time, advances cycle/phase, and immediately enqueues interval completion alerts via Phase 2 notification infrastructure.
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
 *       404:
 *         description: Session not found
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
