import { Schema, model, type Document, type InferSchemaType } from "mongoose";

// A single-instance edit of a recurring series is modelled as an entry in
// the parent event's `exceptions` array. `originalDate` stores the date (as
// UTC midnight of the occurrence's calendar day in the event's timezone) the
// instance would normally have fired. A cancelled entry hides that instance;
// an entry with an `overrideEventId` points at a lightweight "override"
// document whose title/times replace the series defaults for just that date.
const exceptionSchema = new Schema(
  {
    originalDate: { type: Date, required: true },
    isCancelled: { type: Boolean, default: false },
    overrideEventId: { type: Schema.Types.ObjectId, ref: "Event", default: null }
  },
  { _id: false }
);

const eventSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    description: { type: String, default: "", maxlength: 5000 },
    location: { type: String, default: "", maxlength: 500 },
    // Times are stored in UTC; `timezone` records the creating client's IANA
    // zone so display can be timezone-correct later.
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    timezone: { type: String, required: true },
    isAllDay: { type: Boolean, default: false },
    // One document per series, never one per occurrence. Expansion happens at
    // read time via the recurrence service (rrule), not write time.
    recurrenceRule: { type: String, default: null },
    recurrenceEndDate: { type: Date, default: null },
    exceptions: { type: [exceptionSchema], default: [] },
    reminderLeadMinutes: { type: Number, default: null },
    reminderJobId: { type: String, default: null },
    // Lightweight clone of a single occurrence. Never returned as a
    // standalone event; only surfaced through its parent's exception entry.
    isOverride: { type: Boolean, default: false, index: true },
    parentEventId: { type: Schema.Types.ObjectId, ref: "Event", default: null, index: true }
  },
  { timestamps: true }
);

eventSchema.index({ userId: 1, startTime: 1 });

export type EventDoc = InferSchemaType<typeof eventSchema> & Document;

export const Event = model<EventDoc>("Event", eventSchema);
