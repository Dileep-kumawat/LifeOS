import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { Goal } from "../models/Goal.js";
import mongoose from "mongoose";
import { enqueueEmbeddingJob, deleteEmbedding } from "../services/ai/embeddingJob.js";

export const goalsRouter = Router();

goalsRouter.use(requireAuth);

/**
 * Helper to compute progress percentage from milestones.
 */
function calculateMilestoneProgress(milestones: Array<{ completed: boolean }>): number {
  if (!milestones || milestones.length === 0) return 0;
  const completedCount = milestones.filter((m) => m.completed).length;
  return Math.round((completedCount / milestones.length) * 100);
}

/**
 * @openapi
 * /goals:
 *   post:
 *     tags:
 *       - Goals
 *     summary: Create a new goal
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               targetDate:
 *                 type: string
 *                 format: date-time
 *               status:
 *                 type: string
 *                 enum: [active, completed, abandoned]
 *               progressPercent:
 *                 type: number
 *               milestones:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                     completed:
 *                       type: boolean
 *                     order:
 *                       type: number
 *               linkedEventIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               linkedNoteIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Goal created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Goal"
 *             examples:
 *               goal:
 *                 value:
 *                   _id: 662c9f1e9f0b2a001c3d4e5f
 *                   userId: 662c9f1e9f0b2a001c3d4e5a
 *                   title: Run a half marathon
 *                   description: Finish the local March half marathon.
 *                   targetDate: 2026-03-15T00:00:00.000Z
 *                   status: active
 *                   progressPercent: 50
 *                   milestones:
 *                     - _id: 662c9f1e9f0b2a001c3d4e60
 *                       title: Run 5k
 *                       completed: true
 *                       completedAt: 2026-01-05T00:00:00.000Z
 *                       order: 0
 *                     - _id: 662c9f1e9f0b2a001c3d4e61
 *                       title: Run 10k
 *                       completed: false
 *                       completedAt: null
 *                       order: 1
 *                   linkedEventIds: []
 *                   linkedNoteIds: []
 *                   createdAt: 2026-01-01T10:00:00.000Z
 *                   updatedAt: 2026-01-05T12:00:00.000Z
 *                   __v: 0
 *       400:
 *         description: Invalid input, missing title, or manual progressPercent on a goal that has milestones
 *       401:
 *         description: Authentication required
 */
goalsRouter.post("/goals", async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id;
    const {
      title,
      description,
      targetDate,
      status,
      progressPercent,
      milestones,
      linkedEventIds,
      linkedNoteIds
    } = req.body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "Validation Error", message: "Title is required." });
    }

    const hasMilestones = Array.isArray(milestones) && milestones.length > 0;
    let computedProgress = 0;

    if (hasMilestones) {
      computedProgress = calculateMilestoneProgress(milestones);
    } else {
      computedProgress =
        typeof progressPercent === "number" ? Math.min(100, Math.max(0, progressPercent)) : 0;
    }

    const goal = await Goal.create({
      userId,
      title: title.trim(),
      description: description || "",
      targetDate: targetDate ? new Date(targetDate) : null,
      status: status || "active",
      progressPercent: computedProgress,
      milestones: milestones || [],
      linkedEventIds: linkedEventIds || [],
      linkedNoteIds: linkedNoteIds || []
    });

    await enqueueEmbeddingJob("goal", goal._id, userId);

    return res.status(201).json(goal);
  } catch (err: any) {
    return res.status(500).json({ error: "Internal Server Error", message: err.message });
  }
});

/**
 * @openapi
 * /goals:
 *   get:
 *     tags:
 *       - Goals
 *     summary: List user goals
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, completed, abandoned]
 *         description: Filter goals by status
 *     responses:
 *       200:
 *         description: List of user goals
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/Goal"
 *             examples:
 *               goals:
 *                 value:
 *                   - _id: 662c9f1e9f0b2a001c3d4e5f
 *                     userId: 662c9f1e9f0b2a001c3d4e5a
 *                     title: Run a half marathon
 *                     description: Finish the local March half marathon.
 *                     targetDate: 2026-03-15T00:00:00.000Z
 *                     status: active
 *                     progressPercent: 50
 *                     milestones: []
 *                     linkedEventIds: []
 *                     linkedNoteIds: []
 *                     createdAt: 2026-01-01T10:00:00.000Z
 *                     updatedAt: 2026-01-05T12:00:00.000Z
 *                     __v: 0
 *       401:
 *         description: Authentication required
 */
goalsRouter.get("/goals", async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id;
    const { status } = req.query;

    const filter: Record<string, any> = { userId };
    if (status && ["active", "completed", "abandoned"].includes(status as string)) {
      filter.status = status;
    }

    const goals = await Goal.find(filter).sort({ createdAt: -1 });
    return res.json(goals);
  } catch (err: any) {
    return res.status(500).json({ error: "Internal Server Error", message: err.message });
  }
});

/**
 * @openapi
 * /goals/{id}:
 *   get:
 *     tags:
 *       - Goals
 *     summary: Get a goal by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Goal details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Goal"
 *             examples:
 *               goal:
 *                 value:
 *                   _id: 662c9f1e9f0b2a001c3d4e5f
 *                   userId: 662c9f1e9f0b2a001c3d4e5a
 *                   title: Run a half marathon
 *                   description: Finish the local March half marathon.
 *                   targetDate: 2026-03-15T00:00:00.000Z
 *                   status: active
 *                   progressPercent: 50
 *                   milestones: []
 *                   linkedEventIds: []
 *                   linkedNoteIds: []
 *                   createdAt: 2026-01-01T10:00:00.000Z
 *                   updatedAt: 2026-01-05T12:00:00.000Z
 *                   __v: 0
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Goal not found (or not owned by this user)
 */
goalsRouter.get("/goals/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: "Not Found", message: "Goal not found." });
    }

    const goal = await Goal.findOne({ _id: id, userId });
    if (!goal) {
      return res.status(404).json({ error: "Not Found", message: "Goal not found." });
    }

    return res.json(goal);
  } catch (err: any) {
    return res.status(500).json({ error: "Internal Server Error", message: err.message });
  }
});

/**
 * @openapi
 * /goals/{id}:
 *   patch:
 *     tags:
 *       - Goals
 *     summary: Update a goal
 *     description: |
 *       Updates any subset of the goal's fields. Milestone-driven vs manual
 *       progress rule: when the goal has at least one milestone,
 *       `progressPercent` is ALWAYS recomputed from milestone completion and a
 *       `progressPercent` in the request body is rejected with 400 — clients
 *       must toggle milestones via PATCH /goals/{id}/milestones/{milestoneId}
 *       instead. When the goal has no milestones, `progressPercent` may be
 *       supplied directly (clamped to 0-100). Passing `milestones: []`
 *       converts the goal back to manual mode.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string, example: Run a half marathon }
 *               description: { type: string, example: Finish the local March half marathon. }
 *               targetDate: { type: string, format: date-time, nullable: true }
 *               status: { type: string, enum: [active, completed, abandoned] }
 *               progressPercent:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 description: Manual progress. Rejected with 400 when the goal has milestones.
 *               milestones:
 *                 type: array
 *                 description: Replacing with an empty array reverts to manual progress mode.
 *                 items:
 *                   type: object
 *                   properties:
 *                     title: { type: string }
 *                     completed: { type: boolean }
 *                     order: { type: number }
 *               linkedEventIds:
 *                 type: array
 *                 items: { type: string }
 *               linkedNoteIds:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       200:
 *         description: Updated goal
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Goal"
 *       400:
 *         description: Cannot manually update progress percent on goal with milestones
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Goal not found
 */
goalsRouter.patch("/goals/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: "Not Found", message: "Goal not found." });
    }

    const goal = await Goal.findOne({ _id: id, userId });
    if (!goal) {
      return res.status(404).json({ error: "Not Found", message: "Goal not found." });
    }

    const {
      title,
      description,
      targetDate,
      status,
      progressPercent,
      milestones,
      linkedEventIds,
      linkedNoteIds
    } = req.body;

    const nextMilestones = milestones !== undefined ? milestones : goal.milestones;
    const hasMilestones = Array.isArray(nextMilestones) && nextMilestones.length > 0;

    // Reject manual progress percent updates if goal has milestones
    if (hasMilestones && progressPercent !== undefined) {
      return res.status(400).json({
        error: "Bad Request",
        message:
          "Cannot manually update progress percent on a goal with milestones. Please update milestones instead."
      });
    }

    if (title !== undefined) goal.title = title.trim();
    if (description !== undefined) goal.description = description;
    if (targetDate !== undefined) goal.targetDate = targetDate ? new Date(targetDate) : null;
    if (status !== undefined) goal.status = status;
    if (milestones !== undefined) goal.milestones = milestones;
    if (linkedEventIds !== undefined) goal.linkedEventIds = linkedEventIds;
    if (linkedNoteIds !== undefined) goal.linkedNoteIds = linkedNoteIds;

    // Recalculate progressPercent
    if (hasMilestones) {
      goal.progressPercent = calculateMilestoneProgress(goal.milestones);
    } else if (progressPercent !== undefined) {
      goal.progressPercent = Math.min(100, Math.max(0, progressPercent));
    }

    await goal.save();
    await enqueueEmbeddingJob("goal", goal._id, userId);

    return res.json(goal);
  } catch (err: any) {
    return res.status(500).json({ error: "Internal Server Error", message: err.message });
  }
});

/**
 * @openapi
 * /goals/{id}/milestones/{milestoneId}:
 *   patch:
 *     tags:
 *       - Goals
 *     summary: Toggle milestone completion status
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: milestoneId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               completed:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Updated goal with recomputed progress percent
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Goal"
 *       400:
 *         description: Invalid or non-boolean completed value
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Goal or milestone not found
 */
goalsRouter.patch("/goals/:id/milestones/:milestoneId", async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id;
    const { id, milestoneId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(milestoneId)) {
      return res.status(404).json({ error: "Not Found", message: "Goal or milestone not found." });
    }

    const goal = await Goal.findOne({ _id: id, userId });
    if (!goal) {
      return res.status(404).json({ error: "Not Found", message: "Goal not found." });
    }

    const milestone = (goal.milestones as any).id(milestoneId);
    if (!milestone) {
      return res.status(404).json({ error: "Not Found", message: "Milestone not found." });
    }

    const nextCompleted =
      typeof req.body.completed === "boolean" ? req.body.completed : !milestone.completed;

    milestone.completed = nextCompleted;
    milestone.completedAt = nextCompleted ? new Date() : null;

    goal.progressPercent = calculateMilestoneProgress(goal.milestones);
    await goal.save();
    await enqueueEmbeddingJob("goal", goal._id, userId);

    return res.json(goal);
  } catch (err: any) {
    return res.status(500).json({ error: "Internal Server Error", message: err.message });
  }
});

/**
 * @openapi
 * /goals/{id}:
 *   delete:
 *     tags:
 *       - Goals
 *     summary: Delete a goal
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Goal deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *             example:
 *               message: Goal deleted successfully.
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Goal not found
 */
goalsRouter.delete("/goals/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: "Not Found", message: "Goal not found." });
    }

    const goal = await Goal.findOneAndDelete({ _id: id, userId });
    if (!goal) {
      return res.status(404).json({ error: "Not Found", message: "Goal not found." });
    }

    await deleteEmbedding("goal", id);

    return res.json({ message: "Goal deleted successfully." });
  } catch (err: any) {
    return res.status(500).json({ error: "Internal Server Error", message: err.message });
  }
});

/**
 * @openapi
 * components:
 *   schemas:
 *     Goal:
 *       type: object
 *       description: A user goal. `progressPercent` is either manually supplied (no milestones) or computed from milestone completion.
 *       properties:
 *         _id: { type: string }
 *         userId: { type: string }
 *         title: { type: string }
 *         description: { type: string }
 *         targetDate: { type: string, format: date-time, nullable: true }
 *         status: { type: string, enum: [active, completed, abandoned] }
 *         progressPercent: { type: number, minimum: 0, maximum: 100 }
 *         milestones:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               _id: { type: string }
 *               title: { type: string }
 *               completed: { type: boolean }
 *               completedAt: { type: string, format: date-time, nullable: true }
 *               order: { type: number }
 *         linkedEventIds:
 *           type: array
 *           items: { type: string }
 *         linkedNoteIds:
 *           type: array
 *           items: { type: string }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 */
