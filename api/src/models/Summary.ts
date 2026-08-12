import { Schema, model, type Document, type InferSchemaType } from "mongoose";

const completedItemSchema = new Schema(
  {
    id: { type: String },
    title: { type: String, required: true },
    type: { type: String, default: "habit" },
    completedAt: { type: Date }
  },
  { _id: false }
);

const scheduleItemSchema = new Schema(
  {
    occurrenceId: { type: String },
    title: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    location: { type: String, default: "" },
    isAllDay: { type: Boolean, default: false }
  },
  { _id: false }
);

const topPrioritySchema = new Schema(
  {
    title: { type: String, required: true },
    category: { type: String, default: "general" },
    rationale: { type: String, default: "" }
  },
  { _id: false }
);

const summarySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: String, required: true, index: true }, // Normalized calendar date format "YYYY-MM-DD"
    yesterdayCompleted: { type: [completedItemSchema], default: [] },
    todaySchedule: { type: [scheduleItemSchema], default: [] },
    topPriorities: { type: [topPrioritySchema], default: [] },
    generatedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

summarySchema.index({ userId: 1, date: 1 }, { unique: true });

export type SummaryDoc = InferSchemaType<typeof summarySchema> & Document;

export const Summary = model<SummaryDoc>("Summary", summarySchema);
