import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import {
  syncPushRequestSchema,
  syncPullRequestSchema
} from "@lifeos/shared";
import { processSyncPush, processSyncPull } from "../services/sync/syncProcessor.js";

export const syncRouter = Router();

syncRouter.use(requireAuth);

/**
 * @openapi
 * /sync/push:
 *   post:
 *     tags:
 *       - Sync
 *     summary: Push offline client mutations
 *     description: |
 *       Accepts a batch of local creations, updates, and deletions across all mirrored LifeOS modules.
 *       Each change runs through full server business logic, validation, streak recalculation, and budget hooks.
 *       Returns a server cursor and itemized status ("applied" | "conflict" | "error") for each item.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - changes
 *             properties:
 *               changes:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - id
 *                     - module
 *                     - operation
 *                     - lastModifiedAt
 *                   properties:
 *                     id: { type: string }
 *                     module: { type: string, enum: [events, goals, habits, habit_check_ins, notes, note_folders, transactions, budgets, categories, note_versions] }
 *                     operation: { type: string, enum: [create, update, delete] }
 *                     data: { type: object }
 *                     lastModifiedAt: { type: number }
 *                     clientId: { type: string }
 *               deviceId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Sync push processed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cursor: { type: string }
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       module: { type: string }
 *                       status: { type: string, enum: [applied, conflict, error] }
 *                       error: { type: string }
 *                       conflictData: { type: object }
 *                       serverRecord: { type: object }
 *       400:
 *         description: Validation error in request body
 *       401:
 *         description: Authentication required
 */
syncRouter.post(
  "/sync/push",
  validate(syncPushRequestSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!._id.toString();
      const { changes, deviceId } = req.body;

      const result = await processSyncPush(userId, changes, deviceId);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: "Internal Server Error", message: err.message });
    }
  }
);

/**
 * @openapi
 * /sync/pull:
 *   post:
 *     tags:
 *       - Sync
 *     summary: Pull remote server changes since cursor
 *     description: |
 *       Returns all documents modified on the server and tombstones for entities deleted since the specified cursor.
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               since:
 *                 type: string
 *                 nullable: true
 *                 description: ISO timestamp cursor from last successful sync
 *               deviceId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Server changes since cursor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cursor: { type: string }
 *                 serverTime: { type: string }
 *                 changes:
 *                   type: object
 *       401:
 *         description: Authentication required
 */
syncRouter.post(
  "/sync/pull",
  validate(syncPullRequestSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!._id.toString();
      const { since, deviceId } = req.body;

      const result = await processSyncPull(userId, since, deviceId);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: "Internal Server Error", message: err.message });
    }
  }
);

syncRouter.get("/sync/pull", async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id.toString();
    const since = typeof req.query.since === "string" ? req.query.since : null;
    const deviceId = typeof req.query.deviceId === "string" ? req.query.deviceId : undefined;

    const result = await processSyncPull(userId, since, deviceId);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: "Internal Server Error", message: err.message });
  }
});
