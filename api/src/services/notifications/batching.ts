import type { NotificationChannel, NotificationItem } from "@lifeos/shared";

/**
 * FR-13.4 de-duplication / batching. Reminder jobs of the same type + user
 * within a short window collapse into ONE Notification document whose payload
 * carries an array of items, delivered as a single push ("5 habits due today")
 * instead of five separate notifications.
 *
 * All the decision logic here is PURE (collection injected) so it is unit
 * testable without a live database, mirroring the noteFolders/streak services.
 */

/** Window (ms) in which same-type reminders for a user are batched together. */
export const BATCH_WINDOW_MS = 60_000;

export interface BatchableNotificationLike {
  findOne(filter: Record<string, unknown>): Promise<Record<string, unknown> | null>;
}

export interface FindBatchParams {
  userId: string;
  type: string;
  channel: NotificationChannel;
  /** The reminder's intended delivery instant. */
  scheduledFor: Date;
  /** Clock dependency so tests can pin "now". Defaults to new Date(). */
  now?: Date;
}

/**
 * Mongo filter for "a pending notification we can merge into": same
 * user/type/channel, still pending delivery, and scheduled to fire within the
 * batch window BEFORE the incoming job's own schedule. The earliest scheduled
 * document becomes the carrier for the batch.
 */
export function buildBatchQuery({
  userId,
  type,
  channel,
  scheduledFor,
  now
}: FindBatchParams): Record<string, unknown> {
  const anchor = now ?? new Date();
  const windowStart = new Date(anchor.getTime() - BATCH_WINDOW_MS);
  return {
    userId,
    type,
    channel,
    deliveryStatus: "pending",
    scheduledFor: { $gte: windowStart, $lte: scheduledFor }
  };
}

/**
 * Find the existing pending Notification (if any) that an incoming reminder
 * should merge into rather than create a new one.
 */
export async function findBatchableNotification(
  collection: BatchableNotificationLike,
  params: FindBatchParams
): Promise<Record<string, unknown> | null> {
  const filter = buildBatchQuery(params);
  return collection.findOne(filter);
}

/**
 * Append an item to a batch carrier's payload. Returns the new items array
 * (mutates the notification object for the caller).
 */
export function appendBatchItem(
  items: NotificationItem[] | undefined,
  item: NotificationItem
): NotificationItem[] {
  return [...(items ?? []), item];
}

/**
 * A deterministic, human-readable dedupe key for a scheduled reminder. This is
 * what callers pass as `dedupeKey` to `enqueueJob` — it is used BOTH as the
 * BullMQ jobId (so a second enqueue for the same bucket is refused) and as a
 * readable audit value in logs.
 *
 * BullMQ forbids `:` in custom job ids, so the key uses `__` separators and a
 * colon-free timestamp. Bucketing at minute granularity matches BATCH_WINDOW_MS:
 * five habits due in the same minute all produce the same key.
 */
export function deriveDedupeKey(
  type: string,
  userId: string,
  scheduledFor: Date,
  now?: Date
): string {
  const anchor = now ?? new Date();
  const base = new Date(Math.min(scheduledFor.getTime(), anchor.getTime()));
  const y = base.getUTCFullYear();
  const m = String(base.getUTCMonth() + 1).padStart(2, "0");
  const d = String(base.getUTCDate()).padStart(2, "0");
  const h = String(base.getUTCHours()).padStart(2, "0");
  const min = String(base.getUTCMinutes()).padStart(2, "0");
  return `${type}__${userId}__${y}-${m}-${d}T${h}-${min}`;
}
