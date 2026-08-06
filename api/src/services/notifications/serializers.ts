import type { Notification as NotificationShape } from "@lifeos/shared";
import type { NotificationDoc } from "../../models/Notification.js";

/**
 * Map a Mongoose Notification document to the API response shape shared with
 * the web app (and Swagger). Dates become ISO strings, ObjectIds become hex.
 */
export function serializeNotification(doc: NotificationDoc): NotificationShape {
  return {
    id: doc._id.toString(),
    userId: doc.userId.toString(),
    type: doc.type,
    channel: doc.channel,
    payload: {
      title: doc.payload?.title ?? "",
      body: doc.payload?.body ?? "",
      data: (doc.payload?.data ?? {}) as Record<string, unknown>,
      items: ((doc.payload?.items ?? []) as unknown[]) as NotificationShape["payload"]["items"]
    },
    deliveryStatus: doc.deliveryStatus,
    readStatus: doc.readStatus,
    scheduledFor: doc.scheduledFor.toISOString(),
    sentAt: doc.sentAt ? doc.sentAt.toISOString() : null,
    readAt: doc.readAt ? doc.readAt.toISOString() : null,
    createdAt: doc.createdAt.toISOString()
  };
}
