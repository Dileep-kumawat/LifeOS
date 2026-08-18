import { Router, type Request, type Response } from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import {
  syncPushRequestSchema,
  syncPullRequestSchema,
  syncResolveConflictRequestSchema
} from "@lifeos/shared";
import {
  processSyncPush,
  processSyncPull,
  resolveSyncConflict
} from "../services/sync/syncProcessor.js";

export const syncRouter = Router();

syncRouter.use(requireAuth);

/**
 * @openapi
 * /sync/resolve-conflict:
 *   post:
 *     tags:
 *       - Sync
 *     summary: Explicitly resolve a pending sync conflict
 *     description: |
 *       Applies the user's resolution choice ("keep_local" | "keep_server" | "manual_merge")
 *       and persists the resolved state to MongoDB with version history.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/SyncResolveConflictRequest"
 *           examples:
 *             manual_merge_note:
 *               summary: Manual Merge Note Resolution
 *               value:
 *                 id: "662c9f1e9f0b2a001c3d4e80"
 *                 module: "notes"
 *                 resolution: "manual_merge"
 *                 resolvedData:
 *                   title: "Project LifeOS Roadmap (Unified)"
 *                   content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Merged roadmap text from mobile and web edits." }] }] }
 *                   contentText: "Merged roadmap text from mobile and web edits."
 *             keep_local_transaction:
 *               summary: Keep Local Transaction Resolution
 *               value:
 *                 id: "662c9f1e9f0b2a001c3d4e81"
 *                 module: "transactions"
 *                 resolution: "keep_local"
 *     responses:
 *       200:
 *         description: Conflict resolved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: "applied" }
 *                 serverRecord: { type: object }
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 */
syncRouter.post(
  "/sync/resolve-conflict",
  validate(syncResolveConflictRequestSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!._id.toString();
      const { id, module, resolution, resolvedData } = req.body;

      const result = await resolveSyncConflict(userId, id, module, resolution, resolvedData);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: "Internal Server Error", message: err.message });
    }
  }
);

/**
 * @openapi
 * /sync/push:
 *   post:
 *     tags:
 *       - Sync
 *     summary: Push offline client mutations (Local-First Sync Engine)
 *     description: |
 *       Accepts a batch of local creations, updates, and deletions across all mirrored LifeOS modules.
 *       Each change runs through full server business logic, validation, streak recalculation, and budget hooks.
 *       
 *       ### Conflict Resolution & Per-Module Policies:
 *       1. **Notes (`notes`)**: 
 *          * Field-level 3-way merge against base version in `NoteVersion` history.
 *          * Disjoint field edits auto-merge cleanly with status `applied`.
 *          * True conflicts on same field return status `conflict`, retain current server state in `serverRecord`, preserve client candidate in `conflictData`, create historical `NoteVersion`, and surface resolution UI.
 *       2. **Finance (`transactions`, `budgets`) & Habits (`habits`)**:
 *          * Habit check-ins (`habit_check_ins`) use idempotent keyed dedup on `(habitId, date)` with clean LWW boolean update, returning status `applied` without blocking UI.
 *          * Sensitive Financial Transactions & Habit Definitions undergo field-level merge; true conflicts return status `conflict` to prevent silent discard of financial records.
 *       3. **Calendar (`events`)**:
 *          * Applies Last-Write-Wins (LWW). If an event was concurrently modified, returns status `applied` alongside `conflictNotice` informing user of overwrite without modal interruption.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/SyncPushRequest"
 *     responses:
 *       200:
 *         description: Sync push processed with itemized results and updated server cursor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SyncPushResponse"
 *             examples:
 *               clean_apply:
 *                 summary: 1. Clean Apply Batch (Habit Check-In & Goal)
 *                 value:
 *                   cursor: "2026-08-17T12:00:00.000Z"
 *                   results:
 *                     - id: "chk_101"
 *                       module: "habit_check_ins"
 *                       status: "applied"
 *                       serverRecord:
 *                         _id: "chk_101"
 *                         habitId: "662c9f1e9f0b2a001c3d4e80"
 *                         date: "2026-08-17"
 *                         completed: true
 *                     - id: "goal_202"
 *                       module: "goals"
 *                       status: "applied"
 *                       serverRecord:
 *                         _id: "goal_202"
 *                         title: "Run 10km Marathon"
 *                         progressPercent: 75
 *               notes_conflict:
 *                 summary: 2. Notes True Conflict (Field-Level Merge Surfaced)
 *                 value:
 *                   cursor: "2026-08-17T12:00:00.000Z"
 *                   results:
 *                     - id: "note_303"
 *                       module: "notes"
 *                       status: "conflict"
 *                       conflictingFields: ["title", "content"]
 *                       conflictData:
 *                         clientRecord:
 *                           id: "note_303"
 *                           title: "Architecture Sprint Notes (Mobile Client)"
 *                           contentText: "Mobile updated text"
 *                           lastModifiedAt: 1786960000000
 *                         serverRecord:
 *                           _id: "note_303"
 *                           title: "Architecture Sprint Notes (Web Client)"
 *                           contentText: "Web updated text"
 *                           updatedAt: "2026-08-17T11:55:00.000Z"
 *                         conflictingFields: ["title", "content"]
 *                         baseVersionNumber: 3
 *                       serverRecord:
 *                         _id: "note_303"
 *                         title: "Architecture Sprint Notes (Web Client)"
 *               finance_conflict:
 *                 summary: 3. Finance Sensitive Conflict (Prevents Silent Loss)
 *                 value:
 *                   cursor: "2026-08-17T12:00:00.000Z"
 *                   results:
 *                     - id: "tx_404"
 *                       module: "transactions"
 *                       status: "conflict"
 *                       conflictingFields: ["amount"]
 *                       conflictData:
 *                         clientRecord:
 *                           id: "tx_404"
 *                           amount: 120.50
 *                           category: "Dining"
 *                           lastModifiedAt: 1786960000000
 *                         serverRecord:
 *                           _id: "tx_404"
 *                           amount: 145.00
 *                           category: "Dining"
 *                         conflictingFields: ["amount"]
 *                       serverRecord:
 *                         _id: "tx_404"
 *                         amount: 145.00
 *                         category: "Dining"
 *               calendar_lww_notice:
 *                 summary: 4. Calendar LWW with Non-Blocking Flag
 *                 value:
 *                   cursor: "2026-08-17T12:00:00.000Z"
 *                   results:
 *                     - id: "evt_505"
 *                       module: "events"
 *                       status: "applied"
 *                       conflictNotice: "This event was updated on another device and your local change was overwritten"
 *                       serverRecord:
 *                         _id: "evt_505"
 *                         title: "Quarterly Strategy Review"
 *                         startTime: "2026-08-17T14:00:00.000Z"
 *                         endTime: "2026-08-17T15:00:00.000Z"
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
 *     summary: Pull remote server changes since cursor (POST)
 *     description: |
 *       Returns all documents modified on the server and deletion tombstones since the specified ISO timestamp cursor.
 *       
 *       ### Cursor Lifecycle:
 *       * **First-Ever Sync**: Send `since: null` (or omit). Server returns all active user records in `changes.<module>.upserted` and empty `deleted` arrays.
 *       * **Incremental Sync**: Send `since: "<cursor_string>"` received from previous sync response. Server queries records with `updatedAt >= since` and tombstones with `deletedAt >= since`.
 *       * **Cursor Persistence**: Store returned `cursor` string locally in metadata storage (e.g. SQLite `_sync_meta` or local KV store).
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/SyncPullRequest"
 *           examples:
 *             incremental_pull:
 *               summary: Incremental Pull with Cursor
 *               value:
 *                 since: "2026-08-17T10:00:00.000Z"
 *                 deviceId: "pixel-8-pro-alex"
 *             initial_pull:
 *               summary: First-Ever Initial Sync
 *               value:
 *                 since: null
 *                 deviceId: "pixel-8-pro-alex"
 *     responses:
 *       200:
 *         description: Server changes since cursor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SyncPullResponse"
 *       401:
 *         description: Authentication required
 *   get:
 *     tags:
 *       - Sync
 *     summary: Pull remote server changes since cursor (GET)
 *     description: |
 *       Query parameter variant of `/sync/pull`. Accepts `since` and `deviceId` as URL query parameters.
 *     parameters:
 *       - in: query
 *         name: since
 *         required: false
 *         schema:
 *           type: string
 *           nullable: true
 *         description: ISO timestamp cursor from last successful sync (null for initial sync)
 *       - in: query
 *         name: deviceId
 *         required: false
 *         schema:
 *           type: string
 *         description: Client device identifier
 *     responses:
 *       200:
 *         description: Server changes since cursor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SyncPullResponse"
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

/**
 * @openapi
 * components:
 *   schemas:
 *     SyncPushItem:
 *       type: object
 *       required: [id, module, operation, lastModifiedAt]
 *       properties:
 *         id: { type: string, description: Entity unique ID }
 *         module:
 *           type: string
 *           enum: [events, goals, habits, habit_check_ins, notes, note_folders, transactions, budgets, categories, note_versions]
 *         operation:
 *           type: string
 *           enum: [create, update, delete]
 *         data: { type: object, description: Entity payload }
 *         lastModifiedAt: { type: number, description: Unix millisecond timestamp when client updated record locally }
 *         clientId: { type: string, description: Optional client mutation ID }
 *         forceResolution: { type: boolean, description: If true, overrides server conflict check }
 *         resolutionSource:
 *           type: string
 *           enum: [keep_local, keep_server, manual_merge]
 *     SyncPushRequest:
 *       type: object
 *       required: [changes]
 *       properties:
 *         changes:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/SyncPushItem"
 *         deviceId: { type: string }
 *     SyncPushItemResult:
 *       type: object
 *       required: [id, module, status]
 *       properties:
 *         id: { type: string }
 *         module: { type: string }
 *         status:
 *           type: string
 *           enum: [applied, conflict, error]
 *         error: { type: string }
 *         conflictData:
 *           type: object
 *           properties:
 *             clientRecord: { type: object }
 *             serverRecord: { type: object }
 *             conflictingFields: { type: array, items: { type: string } }
 *             baseVersionNumber: { type: number, nullable: true }
 *         serverRecord: { type: object }
 *         conflictNotice: { type: string, description: Informational notice for Calendar LWW overwrites }
 *         conflictingFields: { type: array, items: { type: string } }
 *     SyncPushResponse:
 *       type: object
 *       required: [cursor, results]
 *       properties:
 *         cursor: { type: string, description: Server ISO 8601 cursor timestamp to persist for next sync }
 *         results:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/SyncPushItemResult"
 *     SyncPullRequest:
 *       type: object
 *       properties:
 *         since:
 *           type: string
 *           nullable: true
 *           description: ISO timestamp cursor from last successful sync (null for initial sync)
 *         deviceId: { type: string }
 *     SyncModuleChanges:
 *       type: object
 *       required: [upserted, deleted]
 *       properties:
 *         upserted:
 *           type: array
 *           items: { type: object }
 *         deleted:
 *           type: array
 *           items: { type: string, description: Tombstoned entity IDs deleted on server }
 *     SyncPullResponse:
 *       type: object
 *       required: [cursor, serverTime, changes]
 *       properties:
 *         cursor: { type: string, description: New cursor timestamp to save locally }
 *         serverTime: { type: string, format: date-time }
 *         changes:
 *           type: object
 *           additionalProperties:
 *             $ref: "#/components/schemas/SyncModuleChanges"
 *     SyncResolveConflictRequest:
 *       type: object
 *       required: [id, module, resolution]
 *       properties:
 *         id: { type: string }
 *         module:
 *           type: string
 *           enum: [events, goals, habits, habit_check_ins, notes, note_folders, transactions, budgets, categories, note_versions]
 *         resolution:
 *           type: string
 *           enum: [keep_local, keep_server, manual_merge]
 *         resolvedData: { type: object }
 *         deviceId: { type: string }
 */

