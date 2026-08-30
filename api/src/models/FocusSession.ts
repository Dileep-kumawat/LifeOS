import { Schema, model, type Document, type InferSchemaType, Types } from "mongoose";

/**
 * FocusSession Mongoose Schema
 *
 * Represents an individual Pomodoro focus session. Tracks the current cycle,
 * phase (work, break, long_break), polymorphic links (task, goal, topic, none),
 * pause/resume timestamps, accumulated active work seconds, and authoritative
 * totalFocusMinutes.
 */
const focusSessionSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    workMinutes: { type: Number, default: 25, required: true },
    breakMinutes: { type: Number, default: 5, required: true },
    longBreakMinutes: { type: Number, default: 15, required: true },
    longBreakInterval: { type: Number, default: 4, required: true },
    currentCycle: { type: Number, default: 1, required: true },
    currentPhase: {
      type: String,
      enum: ["work", "break", "long_break"],
      default: "work",
      required: true
    },
    linkedType: {
      type: String,
      enum: ["task", "goal", "topic", "none"],
      default: "none",
      required: true
    },
    linkedId: { type: String, default: null },
    status: {
      type: String,
      enum: ["active", "paused", "completed", "abandoned"],
      default: "active",
      required: true,
      index: true
    },
    startedAt: { type: Date, default: () => new Date(), required: true },
    completedAt: { type: Date, default: null },
    pausedAt: { type: Date, default: null },
    lastResumedAt: { type: Date, default: null },
    accumulatedWorkSeconds: { type: Number, default: 0 },
    totalFocusMinutes: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// Indexes for common query patterns
focusSessionSchema.index({ userId: 1, status: 1 });
focusSessionSchema.index({ userId: 1, startedAt: -1 });
focusSessionSchema.index({ userId: 1, linkedType: 1, linkedId: 1 });

export type FocusSessionDoc = InferSchemaType<typeof focusSessionSchema> & Document;

export const FocusSession = model<FocusSessionDoc>("FocusSession", focusSessionSchema);
