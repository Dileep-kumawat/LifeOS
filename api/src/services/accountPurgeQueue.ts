import { Queue, Worker, type Job } from "bullmq";
import { redis } from "../db/redis.js";
import { logger } from "../logger.js";
import { User } from "../models/User.js";
import { RefreshToken } from "../models/RefreshToken.js";

export const ACCOUNT_PURGE_QUEUE_NAME = "account-purge";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const accountPurgeQueue = new Queue(ACCOUNT_PURGE_QUEUE_NAME, {
  connection: redis
});

interface AccountPurgeJobPayload {
  userId: string;
}

export async function scheduleAccountPurge(userId: string): Promise<void> {
  try {
    await accountPurgeQueue.add(
      "purge-user",
      { userId },
      {
        delay: THIRTY_DAYS_MS,
        jobId: `purge-${userId}`
      }
    );
    logger.info({ userId }, "Scheduled 30-day delayed account purge job");
  } catch (err) {
    logger.warn({ err, userId }, "Failed to enqueue account purge job to Redis queue");
  }
}

// Worker logic to perform hard delete after 30 days
export const accountPurgeWorker = new Worker<AccountPurgeJobPayload>(
  ACCOUNT_PURGE_QUEUE_NAME,
  async (job: Job<AccountPurgeJobPayload>) => {
    const { userId } = job.data;
    logger.info({ userId }, "Executing 30-day account hard purge job");

    const user = await User.findById(userId);
    if (!user || user.status !== "soft_deleted") {
      logger.info({ userId }, "User not found or no longer soft-deleted; skipping hard purge");
      return;
    }

    // Cascade delete associated documents (RefreshToken, and stub for Calendar/Goal/Habit/Note)
    await RefreshToken.deleteMany({ userId });
    await User.findByIdAndDelete(userId);

    logger.info({ userId }, "User account and all associated tokens hard deleted successfully");
  },
  { connection: redis, autorun: process.env.NODE_ENV !== "test" }
);
