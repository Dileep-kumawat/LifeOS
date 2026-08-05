import { Schema, model, type Document, type InferSchemaType } from "mongoose";

const habitCheckInSchema = new Schema(
  {
    habitId: { type: Schema.Types.ObjectId, ref: "Habit", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: String, required: true }, // Normalized calendar date format "YYYY-MM-DD"
    completed: { type: Boolean, required: true, default: true }
  },
  { timestamps: true }
);

habitCheckInSchema.index({ habitId: 1, date: 1 }, { unique: true });
habitCheckInSchema.index({ userId: 1, date: 1 });

export type HabitCheckInDoc = InferSchemaType<typeof habitCheckInSchema> & Document;

export const HabitCheckIn = model<HabitCheckInDoc>("HabitCheckIn", habitCheckInSchema);
