import { Schema, model, type Document, type InferSchemaType } from "mongoose";

const noteSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // Titles are optional in the UI (the editor shows an "Untitled" placeholder),
    // so keep it non-required. Mongoose's `required` validator rejects empty
    // strings after trim, which would break creating an otherwise-blank note.
    title: { type: String, default: "", trim: true, maxlength: 300 },
    // Rich text as a TipTap/ProseMirror JSON document, NOT raw HTML. Kept
    // structural so Phase 3 AI summarization and semantic search can read the
    // tree instead of scraping markup.
    content: { type: Schema.Types.Mixed, default: { type: "doc", content: [] } },
    // Plain-text mirror of `content`, regenerated on every save. This is the
    // field the MongoDB text index actually searches over (a ProseMirror JSON
    // blob is not meaningfully indexable as text).
    contentText: { type: String, default: "", maxlength: 100000 },
    folderId: { type: Schema.Types.ObjectId, ref: "NoteFolder", default: null },
    tags: { type: [String], default: [], index: true }
  },
  { timestamps: true }
);

noteSchema.index({ userId: 1, folderId: 1, updatedAt: -1 });
noteSchema.index(
  { title: "text", contentText: "text" },
  { weights: { title: 10, contentText: 1 }, name: "notes_text" }
);

export type NoteDoc = InferSchemaType<typeof noteSchema> & Document;

export const Note = model<NoteDoc>("Note", noteSchema);
