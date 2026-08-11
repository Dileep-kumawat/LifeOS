import type { NotificationDoc } from "../../models/Notification.js";

/**
 * Inbox read-state queries, exposed through a minimal collection-like surface
 * so the exact filters the endpoints run are unit-testable without a database
 * (same pattern as noteFolders' NoteCollectionLike). The mongoose Notification
 * model satisfies every interface here.
 */

export interface NotificationCollectionLike {
  countDocuments(filter: Record<string, unknown>): Promise<number>;
  updateMany(
    filter: Record<string, unknown>,
    update: Record<string, unknown>
  ): Promise<{ modifiedCount?: number }>;
  findOneAndUpdate(
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    options?: Record<string, unknown>
  ): Promise<unknown>;
}

/**
 * Cheap, frequently-polled unread count. Backed by the (userId, readStatus)
 * compound index — no joins, no aggregation.
 */
export async function countUnreadNotifications(
  collection: NotificationCollectionLike,
  userId: string
): Promise<number> {
  return collection.countDocuments({ userId, readStatus: "unread" });
}

/**
 * Bulk mark-all-read for a user. Idempotent; returns the number of documents
 * actually flipped. Defaults to marking only unread notifications (the
 * meaningful count for the bell); an explicit `readStatus` scope overrides.
 */
export async function markAllNotificationsRead(
  collection: NotificationCollectionLike,
  userId: string,
  readStatus?: string
): Promise<{ updatedCount: number }> {
  const filter: Record<string, unknown> = {
    userId,
    readStatus: readStatus ?? "unread"
  };

  const result = await collection.updateMany(filter, {
    $set: { readStatus: "read", readAt: new Date() }
  });
  return { updatedCount: result.modifiedCount ?? 0 };
}

/**
 * Mark a single owned notification read. Returns null when the id is not a
 * valid ObjectId, doesn't exist, or belongs to another user.
 */
export async function markNotificationRead(
  collection: NotificationCollectionLike,
  userId: string,
  id: string
): Promise<NotificationDoc | null> {
  const doc = await collection.findOneAndUpdate(
    { _id: id, userId },
    { $set: { readStatus: "read", readAt: new Date() } },
    { new: true }
  );
  return (doc as NotificationDoc | null) ?? null;
}
