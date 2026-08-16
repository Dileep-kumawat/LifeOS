import { Schema, model, type Document, type InferSchemaType } from "mongoose";

const noteVersionSchema = new Schema(
  {
    noteId: { type: Schema.Types.ObjectId, ref: "Note", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    versionNumber: { type: Number, required: true },
    title: { type: String, default: "", trim: true, maxlength: 300 },
    content: { type: Schema.Types.Mixed, default: { type: "doc", content: [] } },
    contentText: { type: String, default: "", maxlength: 100000 },
    folderId: { type: Schema.Types.ObjectId, ref: "NoteFolder", default: null },
    tags: { type: [String], default: [] },
    changeSource: {
      type: String,
      enum: ["local", "remote", "conflict_merge", "sync", "manual"],
      default: "local"
    }
  },
  { timestamps: true }
);

noteVersionSchema.index({ noteId: 1, versionNumber: -1 });
noteVersionSchema.index({ userId: 1, noteId: 1 });

export type NoteVersionDoc = InferSchemaType<typeof noteVersionSchema> & Document;

export const NoteVersion = model<NoteVersionDoc>("NoteVersion", noteVersionSchema);
