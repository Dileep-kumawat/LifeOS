import { Schema, model, type Document, type InferSchemaType, Types } from "mongoose";

/**
 * A single notification document. One document == one delivered message
 * (one push, one in-app row, one email). Batching (FR-13.4) reuses a single
 * document across N reminders: the payload's `items` array is appended to,
 * and the job that delivers it fires once — so 5 habits due at 8am collapse
 * into one push, not five.
 *
 * Delivery and read state are intentionally TWO orthogonal fields rather
 * than one overloaded `status` enum — "has it left the queue" (deliveryStatus)
 * is unrelated to "has the user seen it" (readStatus), which only means
 * anything for the in_app channel.
 */
const notificationSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true, index: true },

    // Open `type` string (NOT a closed enum) so later programs (OCR, daily
    // summary, budget alerts) add values without a migration. Known values:
    // calendar_reminder | habit_reminder | system | budget_alert | daily_summary.
    type: { type: String, required: true, index: true },

    channel: { type: String, enum: ["push", "in_app", "email"], required: true },

    // Flexible payload: title/body summary, deep-link `data`, and `items` for
    // batched reminders.
    payload: {
      title: { type: String, default: "" },
      body: { type: String, default: "" },
      data: { type: Schema.Types.Mixed, default: {} },
      items: { type: Schema.Types.Mixed, default: [] }
    },

    deliveryStatus: {
      type: String,
      enum: ["pending", "sent", "failed"],
      default: "pending",
      required: true,
      index: true
    },

    readStatus: {
      type: String,
      enum: ["read", "unread"],
      default: "unread",
      required: true,
      index: true
    },

    scheduledFor: { type: Date, default: () => new Date(), index: true },
    sentAt: { type: Date, default: null },
    readAt: { type: Date, default: null }
  },
  { timestamps: true }
);

// Fast unread-count queries (frequently polled bell badge).
notificationSchema.index({ userId: 1, readStatus: 1 });

// The worker's own lookups for pending deliveries.
notificationSchema.index({ deliveryStatus: 1, scheduledFor: 1 });

export type NotificationDoc = InferSchemaType<typeof notificationSchema> & Document;

export const Notification = model<NotificationDoc>("Notification", notificationSchema);