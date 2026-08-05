import { Schema, model, type Document, type InferSchemaType } from "mongoose";

const milestoneSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    order: { type: Number, default: 0 }
  },
  { _id: true }
);

const goalSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    description: { type: String, default: "", maxlength: 5000 },
    targetDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ["active", "completed", "abandoned"],
      default: "active",
      index: true
    },
    progressPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    milestones: { type: [milestoneSchema], default: [] },
    linkedEventIds: [{ type: Schema.Types.ObjectId, ref: "Event", default: [] }],
    linkedNoteIds: [{ type: Schema.Types.ObjectId, default: [] }]
  },
  { timestamps: true }
);

goalSchema.index({ userId: 1, status: 1 });

export type MilestoneItem = InferSchemaType<typeof milestoneSchema> & { _id: Schema.Types.ObjectId };
export type GoalDoc = InferSchemaType<typeof goalSchema> & Document;

export const Goal = model<GoalDoc>("Goal", goalSchema);
