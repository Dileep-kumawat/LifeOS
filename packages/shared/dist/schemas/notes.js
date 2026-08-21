import { z } from "zod";
// ─── Constants shared between validation, the API, and the client ────────
export const MAX_FOLDER_DEPTH = 5;
export const MAX_NOTE_TITLE_LENGTH = 300;
export const MAX_FOLDER_NAME_LENGTH = 200;
export const MAX_TAG_LENGTH = 50;
export const MAX_TAGS_PER_NOTE = 20;
export const MAX_SEARCH_LENGTH = 200;
// ─── Rich text content ────────────────────────────────────────────────────
// A TipTap/ProseMirror doc is a deeply nested JSON tree. We deliberately
// validate only the outer `doc` shape (a type: "doc" node with a content
// array) rather than every possible node type — Notes are stored as this
// JSON document on purpose (not raw HTML) so Phase 3 AI summarization and
// semantic search can read the structure. Over-validating node internals
// would break forward compatibility as the editor schema grows.
export const prosemirrorDocSchema = z.object({
    type: z.literal("doc"),
    content: z.array(z.record(z.string(), z.unknown())).default([])
});
const objectIdString = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid ObjectId");
// ─── Notes ─────────────────────────────────────────────────────────────────
export const createNoteSchema = z.object({
    // Titles are optional in the UI (the editor shows an "Untitled" placeholder),
    // so we allow blank strings here — contentText/search are driven by the body.
    title: z.string().max(MAX_NOTE_TITLE_LENGTH).trim().default(""),
    content: prosemirrorDocSchema.default({ type: "doc", content: [] }),
    folderId: objectIdString.nullable().optional().default(null),
    tags: z
        .array(z.string().trim().min(1, "Tags cannot be empty").max(MAX_TAG_LENGTH))
        .max(MAX_TAGS_PER_NOTE)
        .optional()
        .default([])
});
export const updateNoteSchema = z.object({
    title: z.string().max(MAX_NOTE_TITLE_LENGTH).trim().optional(),
    content: prosemirrorDocSchema.optional(),
    folderId: objectIdString.nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(MAX_TAG_LENGTH)).max(MAX_TAGS_PER_NOTE).optional()
});
export const listNotesQuerySchema = z.object({
    folderId: objectIdString.optional(),
    tag: z.string().trim().min(1).max(MAX_TAG_LENGTH).optional(),
    search: z
        .string()
        .trim()
        .min(1, "Search query must be non-empty")
        .max(MAX_SEARCH_LENGTH)
        .optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20)
});
export const noteParamsSchema = z.object({
    id: z.string().min(1, "note id is required")
});
// ─── Folders ───────────────────────────────────────────────────────────────
export const createFolderSchema = z.object({
    name: z.string().min(1, "Folder name is required").max(MAX_FOLDER_NAME_LENGTH).trim(),
    parentFolderId: objectIdString.nullable().optional().default(null)
});
export const updateFolderSchema = z.object({
    name: z.string().min(1, "Folder name is required").max(MAX_FOLDER_NAME_LENGTH).trim().optional(),
    parentFolderId: objectIdString.nullable().optional()
});
export const folderParamsSchema = z.object({
    id: z.string().min(1, "folder id is required")
});
