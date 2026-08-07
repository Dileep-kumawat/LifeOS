import { Event, type EventDoc } from "../../models/Event.js";
import { enqueueJob, jobsQueue } from "../queue.js";
import { expandRange } from "../recurrence.js";
import { logger } from "../../logger.js";

/**
 * Schedule a BullMQ reminder job for a single non-recurring calendar event.
 */
export async function scheduleEventReminder(event: EventDoc): Promise<string | null> {
  if (event.reminderLeadMinutes == null || event.reminderLeadMinutes <= 0) {
    return null;
  }

  const startTime = new Date(event.startTime);
  const scheduledFor = new Date(startTime.getTime() - event.reminderLeadMinutes * 60 * 1000);

  const res = await enqueueJob(
    "calendar_reminder",
    {
      eventId: event._id.toString(),
      userId: event.userId.toString()
    },
    { scheduledFor }
  );

  return res.jobId ?? null;
}

/**
 * Cancel a previously scheduled reminder job by ID.
 */
export async function cancelEventReminder(reminderJobId?: string | null): Promise<void> {
  if (!reminderJobId) return;
  try {
    const job = await jobsQueue.getJob(reminderJobId);
    if (job) {
      await job.remove();
      logger.info({ jobId: reminderJobId }, "cancelled calendar reminder job");
    }
  } catch (err) {
    logger.warn({ jobId: reminderJobId, err }, "failed to cancel calendar reminder job");
  }
}

/**
 * Process recurring events for the next 7-day rolling window and enqueue reminder jobs
 * with predictable dedupeKeys so duplicate jobs are automatically refused.
 */
export async function processRecurringEventReminders(now: Date = new Date()): Promise<number> {
  const windowEnd = new Date(now.getTime() + 7 * 86_400_000); // 7 days ahead

  const recurringEvents = await Event.find({
    isOverride: { $ne: true },
    recurrenceRule: { $ne: null },
    reminderLeadMinutes: { $ne: null, $gt: 0 },
    $or: [{ recurrenceEndDate: null }, { recurrenceEndDate: { $gte: now } }]
  });

  let enqueuedCount = 0;

  for (const event of recurringEvents) {
    if (!event.reminderLeadMinutes) continue;

    const occurrences = expandRange([event], now, windowEnd);

    for (const occurrence of occurrences) {
      const occurrenceStart = new Date(occurrence.startTime);
      const scheduledFor = new Date(occurrenceStart.getTime() - event.reminderLeadMinutes * 60 * 1000);

      // Only schedule if reminder time is in the future
      if (scheduledFor.getTime() > now.getTime()) {
        const dedupeKey = `calendar_reminder__${event._id}__${occurrenceStart.toISOString()}`;
        const res = await enqueueJob(
          "calendar_reminder",
          {
            eventId: event._id.toString(),
            userId: event.userId.toString(),
            occurrenceTime: occurrenceStart.toISOString()
          },
          { scheduledFor, dedupeKey }
        );

        if (res.queued) enqueuedCount++;
      }
    }
  }

  return enqueuedCount;
}
