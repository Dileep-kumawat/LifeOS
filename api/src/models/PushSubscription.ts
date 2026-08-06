import { Schema, model, type Document, type InferSchemaType, Types } from "mongoose";

/**
 * A browser/device push subscription registered via the Push API. A user can
 * have several (one per browser/device). The worker sends to every active
 * subscription and deletes any that return 404/410 Gone — a stale endpoint
 * is cleaned up server-side, without waiting for the client to report it.
 */
const pushSubscriptionSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    // Unique per endpoint so re-registering the same browser upserts instead
    // of stacking duplicate rows.
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true }
    },
    userAgent: { type: String, default: "" }
  },
  { timestamps: true }
);

pushSubscriptionSchema.index({ userId: 1, endpoint: 1 });

export type PushSubscriptionDoc = InferSchemaType<typeof pushSubscriptionSchema> & Document;

export const PushSubscription = model<PushSubscriptionDoc>(
  "PushSubscription",
  pushSubscriptionSchema
);