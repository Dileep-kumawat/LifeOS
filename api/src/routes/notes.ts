import { Router, type Request, type Response } from "express";
import { isValidObjectId, type FilterQuery } from "mongoose";
import { Note, type NoteDoc } from "../models/Note.js";
import { NoteFolder, type NoteFolderDoc } from "../models/NoteFolder.js";
import {
  createFolderSchema,
  createNoteSchema,
  folderParamsSchema,
  listNotesQuerySchema,
  noteParamsSchema,
  updateFolderSchema,
  updateNoteSchema
} from "@lifeos/shared";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { extractContentText } from "../services/prosemirror.js";
import { buildNotesListFilter, normalizeSearchTerm } from "../services/noteSearch.js";
import {
  isFolderInChain,
  MAX_FOLDER_DEPTH,
  reassignNotesToRoot,
  wouldExceedMaxDepth,
  type FolderLike
} from "../services/noteFolders.js";

export const notesRouter = Router();

notesRouter.use(requireAuth);

const toFolderLike = (d: NoteFolderDoc): FolderLike => ({
  _id: d._id.toString(),
  parentFolderId: d.parentFolderId ? d.parentFolderId.toString() : null
});

function formatNote(doc: NoteDoc, includeContent: boolean) {
  return {
    id: doc._id.toString(),
    title: doc.title,
    ...(includeContent ? { content: doc.content ?? { type: "doc", content: [] } } : {}),
    contentText: doc.contentText ?? "",
    folderId: doc.folderId ? doc.folderId.toString() : null,
    tags: doc.tags ?? [],
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString()
  };
}

function formatFolder(doc: NoteFolderDoc) {
  return {
    id: doc._id.toString(),
    name: doc.name,
    parentFolderId: doc.parentFolderId ? doc.parentFolderId.toString() : null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString()
  };
}

async function folderBelongsToUser(folderId: string, userId: any): Promise<boolean> {
  if (!isValidObjectId(folderId)) return false;
  const folder = await NoteFolder.findOne({ _id: folderId, userId });
  return Boolean(folder);
}

/**
 * @openapi
 * /notes:
 *   post:
 *     tags: [Notes]
 *     summary: Create a note
 *     description: |
 *       Creates a note. `content` is a TipTap/ProseMirror JSON document (see
 *       the ProseMirrorDoc schema below) — NOT raw HTML. The server flattens
 *       its text into `contentText` on save, which is what full-text search
 *       runs against. `title` may be blank (the editor shows an "Untitled"
 *       placeholder); `folderId` may be null (root) and `tags` is an array of
 *       free-form strings.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string, example: Grocery list }
 *               content:
 *                 $ref: "#/components/schemas/ProseMirrorDoc"
 *               folderId:
 *                 type: string
 *                 nullable: true
 *                 example: 662c9f1e9f0b2a001c3d4e5f
 *               tags:
 *                 type: array
 *                 items: { type: string }
 *                 example: [home, errands]
 *     responses:
 *       201:
 *         description: Note created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 note: { $ref: "#/components/schemas/NoteDetail" }
 *       400:
 *         description: Validation error or unknown folder
 *       401:
 *         description: Authentication required
 */
notesRouter.post("/notes", validate(createNoteSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id;
    const { title, content, folderId, tags } = req.body;

    if (folderId && !(await folderBelongsToUser(folderId, userId))) {
      return res.status(400).json({ error: "ValidationError", message: "Folder not found." });
    }

    const note = await Note.create({
      userId,
      title,
      content,
      contentText: extractContentText(content),
      folderId,
      tags
    });

    return res.status(201).json({ note: formatNote(note, true) });
  } catch (err: any) {
    return res.status(500).json({ error: "Internal Server Error", message: err.message });
  }
});

/**
 * @openapi
 * /notes:
 *   get:
 *     tags: [Notes]
 *     summary: List notes with filters and pagination
 *     description: |
 *       Returns a page of the user's notes. Filters compose: `folderId`
 *       (exact folder), `tag` (exact tag match) and `search` (Mongo full-text
 *       against the `title` + `contentText` text index — title matches rank
 *       above body matches because the index weights title higher). When
 *       `search` is present results are sorted by relevance; otherwise by most
 *       recently updated. Responses never include the full `content` JSON —
 *       use GET /notes/:id for the editor payload.
 *     parameters:
 *       - name: folderId
 *         in: query
 *         schema: { type: string }
 *         description: Filter to notes inside this folder (exact).
 *       - name: tag
 *         in: query
 *         schema: { type: string }
 *         description: Filter to notes carrying this tag.
 *       - name: search
 *         in: query
 *         schema: { type: string, maxLength: 200 }
 *         description: Full-text query (must be non-empty and <= 200 chars).
 *       - name: page
 *         in: query
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - name: limit
 *         in: query
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated list of note summaries
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 notes:
 *                   type: array
 *                   items: { $ref: "#/components/schemas/NoteSummary" }
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page: { type: integer }
 *                     limit: { type: integer }
 *                     total: { type: integer }
 *                     hasMore: { type: boolean }
 *       400:
 *         description: Validation error (e.g. empty or over-long search)
 *       401:
 *         description: Authentication required
 */
notesRouter.get("/notes", validate(listNotesQuerySchema, "query"), async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id;
    const { folderId, tag, search, page, limit } = req.query as unknown as {
      folderId?: string;
      tag?: string;
      search?: string;
      page: number;
      limit: number;
    };

    let searchTerm: string | null = null;
    if (search !== undefined) {
      try {
        searchTerm = normalizeSearchTerm(search);
      } catch (err: any) {
        return res.status(400).json({ error: "ValidationError", message: err.message });
      }
    }

    const { filter, sort } = buildNotesListFilter({ userId: userId.toString(), folderId, tag, search: searchTerm ?? undefined });

    const query = filter as FilterQuery<NoteDoc>;
    const total = await Note.countDocuments(query);
    const docs = await Note.find(query)
      .select("-content")
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit);

    return res.json({
      notes: docs.map((d) => formatNote(d, false)),
      pagination: { page, limit, total, hasMore: page * limit < total }
    });
  } catch (err: any) {
    return res.status(500).json({ error: "Internal Server Error", message: err.message });
  }
});

/**
 * @openapi
 * /notes/folders:
 *   post:
 *     tags: [Notes]
 *     summary: Create a folder (optionally nested)
 *     description: |
 *       Creates a folder. Nesting is supported via `parentFolderId` and capped
 *       at MAX_FOLDER_DEPTH (5) levels — deeper trees are rejected to avoid
 *       pathological recursive queries.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, example: Projects }
 *               parentFolderId:
 *                 type: string
 *                 nullable: true
 *                 description: Parent folder id, or null for a root-level folder.
 *     responses:
 *       201:
 *         description: Folder created
 *       400:
 *         description: Unknown parent folder or nesting depth exceeded
 *       401:
 *         description: Authentication required
 */
notesRouter.post("/notes/folders", validate(createFolderSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id;
    const { name, parentFolderId } = req.body;

    if (parentFolderId && !(await folderBelongsToUser(parentFolderId, userId))) {
      return res.status(400).json({ error: "ValidationError", message: "Parent folder not found." });
    }

    const folders = await NoteFolder.find({ userId });
    if (wouldExceedMaxDepth(folders.map(toFolderLike), parentFolderId)) {
      return res.status(400).json({
        error: "ValidationError",
        message: `Folders can only nest ${MAX_FOLDER_DEPTH} levels deep.`
      });
    }

    const folder = await NoteFolder.create({ userId, name, parentFolderId });
    return res.status(201).json({ folder: formatFolder(folder) });
  } catch (err: any) {
    return res.status(500).json({ error: "Internal Server Error", message: err.message });
  }
});

/**
 * @openapi
 * /notes/folders:
 *   get:
 *     tags: [Notes]
 *     summary: List all folders (flat — the client builds the tree)
 *     responses:
 *       200:
 *         description: Flat folder list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 folders:
 *                   type: array
 *                   items: { $ref: "#/components/schemas/NoteFolder" }
 *       401:
 *         description: Authentication required
 */
notesRouter.get("/notes/folders", async (req: Request, res: Response) => {
  try {
    const folders = await NoteFolder.find({ userId: req.user!._id }).sort({ name: 1 });
    return res.json({ folders: folders.map(formatFolder) });
  } catch (err: any) {
    return res.status(500).json({ error: "Internal Server Error", message: err.message });
  }
});

/**
 * @openapi
 * /notes/folders/{id}:
 *   patch:
 *     tags: [Notes]
 *     summary: Rename a folder or move it under a different parent
 *     description: |
 *       `name` and/or `parentFolderId` may be provided. Passing
 *       `parentFolderId: null` moves the folder back to root. Reparenting into
 *       one of the folder's own descendants is rejected (would create a
 *       cycle), as is nesting deeper than 5 levels.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               parentFolderId: { type: string, nullable: true }
 *     responses:
 *       200:
 *         description: Updated folder
 *       400:
 *         description: Cycle, depth cap, or unknown parent
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Folder not found
 */
notesRouter.patch(
  "/notes/folders/:id",
  validate(folderParamsSchema, "params"),
  validate(updateFolderSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!._id;
      const { id } = req.params as { id: string };
      const { name, parentFolderId } = req.body;

      const folder = await NoteFolder.findOne({ _id: id, userId });
      if (!folder) {
        return res.status(404).json({ error: "Not Found", message: "Folder not found." });
      }

      if (parentFolderId !== undefined) {
        if (parentFolderId === id) {
          return res.status(400).json({ error: "ValidationError", message: "A folder cannot be its own parent." });
        }

        const folders = await NoteFolder.find({ userId });
        const folderLikes = folders.map(toFolderLike);

        if (parentFolderId) {
          if (!(await folderBelongsToUser(parentFolderId, userId))) {
            return res.status(400).json({ error: "ValidationError", message: "Parent folder not found." });
          }
          if (isFolderInChain(folderLikes, parentFolderId, id)) {
            return res.status(400).json({
              error: "ValidationError",
              message: "Cannot move a folder into one of its own descendants."
            });
          }
        }

        if (wouldExceedMaxDepth(folderLikes, parentFolderId)) {
          return res.status(400).json({
            error: "ValidationError",
            message: `Folders can only nest ${MAX_FOLDER_DEPTH} levels deep.`
          });
        }

        folder.parentFolderId = parentFolderId;
      }

      if (name !== undefined) {
        folder.name = name;
      }

      await folder.save();
      return res.json({ folder: formatFolder(folder) });
    } catch (err: any) {
      return res.status(500).json({ error: "Internal Server Error", message: err.message });
    }
  }
);

/**
 * @openapi
 * /notes/folders/{id}:
 *   delete:
 *     tags: [Notes]
 *     summary: Delete a folder
 *     description: |
 *       Deleting a folder does NOT delete the notes inside it. Phase 1
 *       behavior: notes are reassigned to root (folderId = null) — less
 *       destructive than cascading deletion and reversible. Sub-folders are
 *       reparented to the deleted folder's parent so the rest of the tree
 *       survives intact.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Folder deleted; notes reassigned to root
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Folder not found
 */
notesRouter.delete(
  "/notes/folders/:id",
  validate(folderParamsSchema, "params"),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!._id;
      const { id } = req.params as { id: string };

      const folder = await NoteFolder.findOneAndDelete({ _id: id, userId });
      if (!folder) {
        return res.status(404).json({ error: "Not Found", message: "Folder not found." });
      }

      const { updatedCount } = await reassignNotesToRoot(Note, id, userId.toString());
      await NoteFolder.updateMany(
        { parentFolderId: id, userId },
        { $set: { parentFolderId: folder.parentFolderId ?? null } }
      );

      return res.json({
        message: `Folder deleted. ${updatedCount} note(s) moved to root; sub-folders reparented.`
      });
    } catch (err: any) {
      return res.status(500).json({ error: "Internal Server Error", message: err.message });
    }
  }
);

/**
 * @openapi
 * /notes/tags:
 *   get:
 *     tags: [Notes]
 *     summary: List distinct tags in use
 *     description: |
 *       Returns the distinct set of tags currently used across the user's
 *       notes, for autocomplete and tag-filter UI.
 *     responses:
 *       200:
 *         description: Distinct tags
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tags:
 *                   type: array
 *                   items: { type: string }
 *       401:
 *         description: Authentication required
 */
notesRouter.get("/notes/tags", async (req: Request, res: Response) => {
  try {
    const tags = await Note.distinct("tags", { userId: req.user!._id });
    return res.json({ tags });
  } catch (err: any) {
    return res.status(500).json({ error: "Internal Server Error", message: err.message });
  }
});

/**
 * @openapi
 * /notes/{id}:
 *   get:
 *     tags: [Notes]
 *     summary: Get a note by ID
 *     description: |
 *       Returns the full note INCLUDING the ProseMirror `content` JSON so the
 *       editor can load it.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Full note
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 note: { $ref: "#/components/schemas/NoteDetail" }
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Note not found (or not owned by this user)
 */
notesRouter.get("/notes/:id", validate(noteParamsSchema, "params"), async (req: Request, res: Response) => {
  try {
    const doc = await Note.findOne({ _id: req.params.id, userId: req.user!._id });
    if (!doc) {
      return res.status(404).json({ error: "Not Found", message: "Note not found." });
    }
    return res.json({ note: formatNote(doc, true) });
  } catch (err: any) {
    return res.status(500).json({ error: "Internal Server Error", message: err.message });
  }
});

/**
 * @openapi
 * /notes/{id}:
 *   patch:
 *     tags: [Notes]
 *     summary: Update a note
 *     description: |
 *       Accepts any subset of title/content/folderId/tags. When `content` is
 *       provided, `contentText` is recomputed from the new ProseMirror JSON so
 *       the text index stays current. Setting `folderId: null` moves the note
 *       to root.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               content: { $ref: "#/components/schemas/ProseMirrorDoc" }
 *               folderId: { type: string, nullable: true }
 *               tags: { type: array, items: { type: string } }
 *     responses:
 *       200:
 *         description: Updated note
 *       400:
 *         description: Validation error or unknown folder
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Note not found
 */
notesRouter.patch(
  "/notes/:id",
  validate(noteParamsSchema, "params"),
  validate(updateNoteSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!._id;
      const { id } = req.params as { id: string };
      const { title, content, folderId, tags } = req.body;

      const note = await Note.findOne({ _id: id, userId });
      if (!note) {
        return res.status(404).json({ error: "Not Found", message: "Note not found." });
      }

      if (title !== undefined) note.title = title;

      if (content !== undefined) {
        note.content = content;
        note.markModified("content");
        note.contentText = extractContentText(content);
      }

      if (folderId !== undefined) {
        if (folderId && !(await folderBelongsToUser(folderId, userId))) {
          return res.status(400).json({ error: "ValidationError", message: "Folder not found." });
        }
        note.folderId = folderId;
      }

      if (tags !== undefined) note.tags = tags;

      await note.save();
      return res.json({ note: formatNote(note, true) });
    } catch (err: any) {
      return res.status(500).json({ error: "Internal Server Error", message: err.message });
    }
  }
);

/**
 * @openapi
 * /notes/{id}:
 *   delete:
 *     tags: [Notes]
 *     summary: Delete a note (hard delete)
 *     description: |
 *       Hard-deletes the note. Phase 1 has no version history (that is
 *       deferred), so there is nothing to preserve or soft-delete.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Note deleted
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Note not found
 */
notesRouter.delete("/notes/:id", validate(noteParamsSchema, "params"), async (req: Request, res: Response) => {
  try {
    const userId = req.user!._id;
    const { id } = req.params as { id: string };

    const note = await Note.findOneAndDelete({ _id: id, userId });
    if (!note) {
      return res.status(404).json({ error: "Not Found", message: "Note not found." });
    }

    return res.json({ message: "Note deleted." });
  } catch (err: any) {
    return res.status(500).json({ error: "Internal Server Error", message: err.message });
  }
});

/**
 * @openapi
 * components:
 *   schemas:
 *     ProseMirrorDoc:
 *       type: object
 *       description: |
 *         A TipTap/ProseMirror rich-text document stored as JSON (never raw
 *         HTML — the structure is what Phase 3 AI summarization and search
 *         will read). A doc is a `type: "doc"` node with an array of child
 *         nodes. Every node has a `type`; text nodes carry a `text` string and
 *         optional `marks`; container nodes (paragraph, heading, listItem,
 *         taskItem, taskList, bulletList, orderedList) nest further nodes in
 *         their `content` array; leaf/void nodes (image) carry `attrs`.
 *         Example:
 *         ```json
 *         {
 *           "type": "doc",
 *           "content": [
 *             { "type": "heading", "attrs": { "level": 2 }, "content": [{ "type": "text", "text": "Shopping" }] },
 *             { "type": "taskList", "content": [{ "type": "taskItem", "attrs": { "checked": false }, "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Milk" }] }] }] }
 *           ]
 *         }
 *         ```
 *         The server flattens the text into `contentText` on every save; the
 *         `title` + `contentText` fields are covered by the Mongo text index
 *         used by `search`.
 *       required: [type, content]
 *       properties:
 *         type:
 *           type: string
 *           enum: [doc]
 *         content:
 *           type: array
 *           items:
 *             type: object
 *             description: Any ProseMirror node (see description).
 *     NoteSummary:
 *       type: object
 *       description: Note shape returned by list endpoints (content omitted).
 *       required: [id, title, contentText, folderId, tags, createdAt, updatedAt]
 *       properties:
 *         id: { type: string }
 *         title: { type: string }
 *         contentText:
 *           type: string
 *           description: Plain-text mirror of the document, truncated for previews.
 *         folderId: { type: string, nullable: true }
 *         tags: { type: array, items: { type: string } }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *     NoteDetail:
 *       type: object
 *       description: Full note shape returned by GET /notes/:id — includes the editor payload.
 *       allOf:
 *         - $ref: "#/components/schemas/NoteSummary"
 *         - type: object
 *           properties:
 *             content: { $ref: "#/components/schemas/ProseMirrorDoc" }
 *     NoteFolder:
 *       type: object
 *       description: A folder. Tree shape is derived client-side from parentFolderId.
 *       required: [id, name, parentFolderId, createdAt, updatedAt]
 *       properties:
 *         id: { type: string }
 *         name: { type: string }
 *         parentFolderId: { type: string, nullable: true }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 */
