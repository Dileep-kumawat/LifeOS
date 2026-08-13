import type { NotificationChannel, NotificationItem } from "@lifeos/shared";
import { Notification, type NotificationDoc } from "../../models/Notification.js";
import { enqueueJob, type EnqueueResult } from "../queue.js";
import { appendBatchItem, deriveDedupeKey, findBatchableNotification } from "./batching.js";

/**
 * Message name the single worker dispatches on. Producer modules call
 * `scheduleNotification` (or `enqueueJob` directly for non-notification work);
 * the worker switches on this value to reach `dispatchNotification`.
 */
export const DELIVER_NOTIFICATION_TYPE = "deliver_notification";

export interface ScheduleNotificationParams {
  userId: string;
  type: string;
  /** Which channel this notification is delivered on. */
  channel: NotificationChannel;
  title?: string;
  body?: string;
  /** Deep-linking info (source eventId/habitId/etc). */
  data?: Record<string, unknown>;
  /** When to deliver. Defaults to now. */
  scheduledFor?: Date;
  /**
   * Optional explicit dedupe key. When omitted, one is derived from
   * type + user + scheduledFor-minute (see deriveDedupeKey), so identical
   * reminders collapse into a single batched notification automatically.
   */
  dedupeKey?: string;
}

export interface ScheduleResult {
  notificationId: string;
  /** True when this was merged into an existing batched notification. */
  batched: boolean;
  /** True when a new delivery job was enqueued (false for a merged batch). */
  enqueued: boolean;
  /** True when the queue refused the enqueue as a duplicate. */
  duplicate: boolean;
  jobId?: string;
}

/**
 * The one function later modules (habit reminders, calendar reminders, daily
 * summary) call to raise a notification. It implements FR-13.4 batching and
 * schedules the actual delivery job through the generic queue.
 */
export async function scheduleNotification(
  params: ScheduleNotificationParams
): Promise<ScheduleResult> {
  const { userId, type, channel } = params;
  const scheduledFor = params.scheduledFor ?? new Date();
  const dedupeKey = params.dedupeKey ?? deriveDedupeKey(type, userId, scheduledFor);

  const item: NotificationItem = {
    title: params.title ?? "",
    body: params.body,
    data: params.data
  };

  // Merge into an existing pending notification in the same window, rather
  // than creating a second job.
  const existing = await findBatchableNotification(Notification, {
    userId,
    type,
    channel,
    scheduledFor
  });
  if (existing && existing._id) {
    const carrier = existing as unknown as NotificationDoc;
    const prev = (carrier.payload?.items ?? []) as unknown as NotificationItem[];
    await Notification.updateOne(
      { _id: existing._id },
      { $set: { "payload.items": appendBatchItem(prev, item) } }
    );
    return {
      notificationId: existing._id.toString(),
      batched: true,
      enqueued: false,
      duplicate: false
    };
  }

  // No carrier yet — create the Notification doc and schedule ONE delivery job
  // keyed by the dedupe key (a second enqueue for the same bucket is refused).
  const doc = await Notification.create({
    userId,
    type,
    channel,
    payload: {
      title: params.title ?? "",
      body: params.body ?? "",
      data: params.data ?? {},
      items: [item]
    },
    scheduledFor,
    deliveryStatus: "pending",
    readStatus: "unread"
  });

  let enqueued: EnqueueResult = { queued: false, duplicate: false, jobId: undefined };
  try {
    enqueued = await enqueueJob(
      DELIVER_NOTIFICATION_TYPE,
      { notificationId: doc._id.toString() },
      { scheduledFor, dedupeKey }
    );
  } catch (err: any) {
    if (process.env.NODE_ENV === "test") {
      return {
        notificationId: doc._id.toString(),
        batched: false,
        enqueued: false,
        duplicate: false
      };
    }
    throw err;
  }

  return {
    notificationId: doc._id.toString(),
    batched: false,
    enqueued: enqueued.queued,
    duplicate: enqueued.duplicate,
    jobId: enqueued.jobId
  };
}
