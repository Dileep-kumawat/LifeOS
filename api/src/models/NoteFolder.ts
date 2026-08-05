import { Schema, model, type Document, type InferSchemaType } from "mongoose";

const noteFolderSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    // Supports nested folders. Nesting depth is capped in validation (see
    // services/noteFolders.ts MAX_FOLDER_DEPTH) to avoid pathological
    // recursive queries on deep trees.
    parentFolderId: { type: Schema.Types.ObjectId, ref: "NoteFolder", default: null }
  },
  { timestamps: true }
);

noteFolderSchema.index({ userId: 1, parentFolderId: 1, name: 1 });

export type NoteFolderDoc = InferSchemaType<typeof noteFolderSchema> & Document;

export const NoteFolder = model<NoteFolderDoc>("NoteFolder", noteFolderSchema);
