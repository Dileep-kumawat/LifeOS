import { Queue } from "bullmq";
import { redis } from "../db/redis.js";
import { logger } from "../logger.js";

/**
 * ONE generic BullMQ queue for the whole application. Do not create a queue
 * per feature (no `reminderQueue`, no `ocrQueue`, no `summaryQueue`). Every
 * job is added to this single queue with a `type` discriminator; a single
 * worker file switches on `type` to route to the right handler. Later phases
 * (OCR, embeddings, daily summary) only need to enqueue new `type`s and add a
 * `case` to the worker — the queue infrastructure itself never changes.
 *
 * The `type` is set BOTH as the job name (BullMQ's first `add` arg) and
 * mirrored onto the payload, so the worker can dispatch on `job.name` and the
 * payload stays self-describing for downstream handlers.
 */
export const JOBS_QUEUE_NAME = "lifeos-jobs";

export interface EnqueueOptions {
  /** Delay in milliseconds before the job becomes eligible. */
  delay?: number;
  /**
   * Absolute ISO date/Date to deliver. Converts to a BullMQ delay. When both
   * `delay` and `scheduledFor` are given, `scheduledFor` wins.
   */
  scheduledFor?: string | Date;
  /**
   * Queue-level dedupe key. When present, used as the BullMQ jobId: if a job
   * with this key is already queued/delayed/active, the enqueue is refused and
   * the caller is told it was a duplicate. This is what keeps reminders from
   * being double-enqueued without every caller re-implementing a uniqueness
   * check. Pretty-print batch content here, e.g.
   * `habit_reminder__662c9f1e__2026-08-06T08-00`. Note BullMQ jobIds cannot
   * contain `:`, so callers must keep dedupe keys colon-free.
   */
  dedupeKey?: string;
}

export interface EnqueueResult {
  queued: boolean;
  duplicate: boolean;
  jobId?: string;
}

export const jobsQueue = new Queue(JOBS_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    // 3 attempts with exponential backoff before the job is dead-lettered.
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 }
  }
});

/**
 * Generic job enqueue. The single entry point every feature uses to schedule
 * async work. Delayed jobs (`scheduledFor` a future timestamp) are how
 * reminders ("do this at time X, not now") work.
 */
export async function enqueueJob(
  type: string,
  payload: Record<string, unknown>,
  opts: EnqueueOptions = {}
): Promise<EnqueueResult> {
  const { scheduledFor, delay, dedupeKey } = opts;

  let resolvedDelay: number | undefined = delay;
  if (scheduledFor) {
    resolvedDelay = Math.max(0, new Date(scheduledFor).getTime() - Date.now());
  }

  const addOptions: Record<string, unknown> = {};
  if (resolvedDelay && resolvedDelay > 0) addOptions.delay = resolvedDelay;
  if (dedupeKey) addOptions.jobId = dedupeKey;

  // Refuse a duplicate that is already in the queue. BullMQ enforces this on
  // `add` too, but a direct existence check lets us log the skip cleanly and
  // return an explicit `duplicate: true` to callers.
  if (dedupeKey) {
    const existing = await jobsQueue.getJob(dedupeKey);
    if (existing) {
      logger.info(
        { type, jobId: dedupeKey, scheduledFor },
        "job skipped — a job with the same dedupeKey is already pending"
      );
      return { queued: false, duplicate: true, jobId: dedupeKey };
    }
  }

  try {
    const job = await jobsQueue.add(type, { ...payload, type }, addOptions);
    logger.info({ type, jobId: job.id, scheduledFor, delay: resolvedDelay }, "job enqueued");
    return { queued: true, duplicate: false, jobId: job.id ?? undefined };
  } catch (err) {
    // A concurrent enqueue can still win the race and throw BullMQ's
    // duplicate-id error — treat it as a duplicate, not a failure.
    if (dedupeKey && err instanceof Error && /duplicat/i.test(err.message)) {
      logger.info(
        { type, jobId: dedupeKey },
        "job skipped — duplicate-id race detected (already enqueued elsewhere)"
      );
      return { queued: false, duplicate: true, jobId: dedupeKey };
    }
    throw err;
  }
}

/**
 * Human-friendly alias so callers spell out intent. Same queue, same wrapper.
 */
export { enqueueJob as enqueue };
