import { Schema, model, type Document, type InferSchemaType } from "mongoose";

const topicSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    deadline: { type: Date, default: null },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
      index: true
    },
    status: {
      type: String,
      enum: ["not_started", "in_progress", "completed"],
      default: "not_started",
      index: true
    },
    estimatedMinutes: { type: Number, default: null }
  },
  { timestamps: true }
);

topicSchema.index({ userId: 1, subjectId: 1, createdAt: -1 });
topicSchema.index({ userId: 1, deadline: 1 });

export type TopicDoc = InferSchemaType<typeof topicSchema> & Document;

export const Topic = model<TopicDoc>("Topic", topicSchema);
