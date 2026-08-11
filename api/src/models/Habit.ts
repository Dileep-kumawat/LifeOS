import { Schema, model, type Document, type InferSchemaType } from "mongoose";

const frequencySchema = new Schema(
  {
    type: {
      type: String,
      enum: ["daily", "weekly", "custom"],
      required: true,
      default: "daily"
    },
    daysOfWeek: { type: [Number], default: [] }, // 0=Sunday..6=Saturday for weekly/custom
    timesPerPeriod: { type: Number, default: 1 } // for custom e.g. "3x per week"
  },
  { _id: false }
);

const habitSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    frequency: { type: frequencySchema, required: true },

    // Per-habit reminder settings
    reminderTime: { type: String, default: null }, // HH:mm format e.g. "08:00"
    reminderEnabled: { type: Boolean, default: false },

    // Cached derived stats — updated on check-in, never recomputed on read
    currentStreak: { type: Number, default: 0, min: 0 },
    longestStreak: { type: Number, default: 0, min: 0 },
    completionRate: { type: Number, default: 0, min: 0, max: 1 }, // 0.0 to 1.0 (rolling 30 days)
    lastCheckInDate: { type: String, default: null } // YYYY-MM-DD string
  },
  { timestamps: true }
);

habitSchema.index({ userId: 1, createdAt: -1 });

export type HabitDoc = InferSchemaType<typeof habitSchema> & Document;

export const Habit = model<HabitDoc>("Habit", habitSchema);
