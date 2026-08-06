import { Worker, type Job } from "bullmq";
import { redis } from "../db/redis.js";
import { logger } from "../logger.js";
import { JOBS_QUEUE_NAME } from "./queue.js";
import { Notification } from "../models/Notification.js";
import { User } from "../models/User.js";
import { PushSubscription } from "../models/PushSubscription.js";
import { sendEmail } from "./emailService.js";
import { sendPushNotification } from "./notifications/sendPush.js";
import { dispatchNotification, type DeliveryDeps, type NotificationLike } from "./notifications/delivery.js";
import { DELIVER_NOTIFICATION_TYPE } from "./notifications/scheduler.js";
import type { NotificationPreferences } from "@lifeos/shared";

/**
 * THE single job worker. Every async job in the app flows through here — a
 * `switch` on the job name routes to the right handler. Adding a later feature
 * (OCR, embeddings, daily summary) means adding a `case` and a handler
 * function; the queue wrapper and this worker's shell never change.
 */

interface DeliverNotificationJobData {
  notificationId: string;
  type?: string;
}

async function handleDeliverNotification(job: Job<DeliverNotificationJobData>): Promise<void> {
  const { notificationId } = job.data;
  const notification = await Notification.findById(notificationId);
  if (!notification) {
    logger.warn({ notificationId, jobId: job.id }, "deliver_notification: notification not found");
    return;
  }

  const user = await User.findById(notification.userId);
  if (!user || user.status !== "active") {
    logger.info(
      { notificationId, userId: notification.userId.toString() },
      "deliver_notification: user missing/inactive — dropping"
    );
    return;
  }

  const deps: DeliveryDeps = {
    getSubscriptions: (userId) =>
      PushSubscription.find({ userId })
        .select("_id endpoint keys userAgent")
        .lean()
        .then((docs) =>
          docs.map((d) => ({
            _id: d._id.toString(),
            endpoint: d.endpoint,
            keys: { p256dh: d.keys?.p256dh ?? "", auth: d.keys?.auth ?? "" }
          }))
        ),
    sendPush: (sub, payload) =>
      sendPushNotification(
        { id: sub._id, endpoint: sub.endpoint, keys: sub.keys },
        payload
      ),
    deleteSubscriptions: (ids) => PushSubscription.deleteMany({ _id: { $in: ids } }).then(() => undefined),
    markDelivered: (id, sentAt) =>
      Notification.updateOne(
        { _id: id },
        { $set: { deliveryStatus: "sent", sentAt } }
      ).then(() => undefined),
    sendEmail: (args) => sendEmail(args),
    prefsUserEmail: user.email
  };

  const outcome = await dispatchNotification(
    notification as unknown as NotificationLike,
    (user.notificationPreferences ?? undefined) as NotificationPreferences | undefined,
    deps
  );

  logger.info(
    {
      outcome: outcome.outcome,
      reason: outcome.reason,
      cleaned: outcome.cleanedSubscriptionIds,
      notificationId,
      type: notification.type,
      channel: notification.channel
    },
    "deliver_notification: dispatch finished"
  );

  // A transient failure (real push error, nothing cleaned up) throws so
  // BullMQ retries with exponential backoff (3 attempts), then dead-letters.
  if (outcome.outcome === "pending_retry") {
    throw new Error("push delivery failed transiently — retrying");
  }
}

/** Dispatch table: job name -> handler. */
const HANDLERS: Record<string, (job: Job) => Promise<void>> = {
  [DELIVER_NOTIFICATION_TYPE]: handleDeliverNotification
};

async function processJob(job: Job): Promise<void> {
  const handler = HANDLERS[job.name];
  if (!handler) {
    throw new Error(`unknown job type "${job.name}" — no handler registered`);
  }
  await handler(job);
}

/**
 * Dead-letter/failure path: jobs that exhaust their 3 attempts land here with
 * enough context (jobId, type, attempts, payload) to debug — never silently
 * dropped. The `failed` event fires only after retries are exhausted.
 */
export const jobsWorker = new Worker(JOBS_QUEUE_NAME, processJob, {
  connection: redis,
  // Never auto-start on import; index.ts calls startJobsWorker() explicitly so
  // importing the module (e.g. in tests) has no side effects.
  autorun: false
});

jobsWorker.on("failed", (job, err) => {
  logger.error(
    {
      jobId: job?.id,
      jobName: job?.name,
      attemptsMade: job?.attemptsMade,
      data: job?.data,
      err
    },
    "job dead-lettered after exhausting retries"
  );
});

jobsWorker.on("completed", (job) => {
  logger.info({ jobId: job.id, jobName: job.name }, "job completed");
});

jobsWorker.on("error", (err) => {
  logger.warn({ err }, "jobs worker error");
});

// Worker author run: constructed with autorun:false so importing the module
// (e.g. in tests) has no side effects. index.ts calls this on boot.
export function startJobsWorker(): void {
  jobsWorker.run().catch((err) => logger.error({ err }, "failed to start jobs worker"));
}
