import { Schema, model, type Document, type InferSchemaType, Types } from "mongoose";

/**
 * A browser/device push subscription or FCM mobile device token.
 * A user can have several (one per browser/device). The worker sends to every active
 * subscription/token and deletes any that return invalid/stale response codes.
 */
const pushSubscriptionSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["web", "fcm"], default: "web", index: true },
    // Unique per endpoint/token so re-registering the same browser/device upserts
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, default: null },
      auth: { type: String, default: null }
    },
    fcmToken: { type: String, default: null },
    deviceType: { type: String, enum: ["android", "ios", "web"], default: "web" },
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
