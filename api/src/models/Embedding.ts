import { Schema, model, type Document, type InferSchemaType } from "mongoose";

export type SourceType = "note" | "goal" | "habit" | "event";

const embeddingSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    sourceType: {
      type: String,
      enum: ["note", "goal", "habit", "event"],
      required: true,
      index: true
    },
    sourceId: { type: Schema.Types.ObjectId, required: true, index: true },
    embeddedText: { type: String, required: true },
    title: { type: String, default: "" },
    vector: { type: [Number], required: true }
  },
  { timestamps: true }
);

// Unique compound index: each source document has exactly 1 embedding record
embeddingSchema.index({ sourceType: 1, sourceId: 1 }, { unique: true });
embeddingSchema.index({ userId: 1, sourceType: 1 });

export type EmbeddingDoc = InferSchemaType<typeof embeddingSchema> & Document;

export const Embedding = model<EmbeddingDoc>("Embedding", embeddingSchema);
