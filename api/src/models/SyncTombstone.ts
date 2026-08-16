import { Schema, model, type Document, type InferSchemaType, Types } from "mongoose";

/**
 * Tracks deleted entities so sync pull can notify clients of deletions
 * that occurred on server or other devices after client's sync cursor.
 */
const syncTombstoneSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    module: { type: String, required: true, index: true },
    entityId: { type: String, required: true, index: true },
    deletedAt: { type: Date, default: Date.now, index: true }
  },
  { timestamps: false }
);

syncTombstoneSchema.index({ userId: 1, deletedAt: 1 });
syncTombstoneSchema.index({ userId: 1, module: 1, entityId: 1 }, { unique: true });

export type SyncTombstoneDoc = InferSchemaType<typeof syncTombstoneSchema> & Document;

export const SyncTombstone = model<SyncTombstoneDoc>("SyncTombstone", syncTombstoneSchema);
