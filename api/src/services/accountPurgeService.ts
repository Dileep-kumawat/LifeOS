import { Types } from "mongoose";
import { User } from "../models/User.js";
import { RefreshToken } from "../models/RefreshToken.js";
import { Event } from "../models/Event.js";
import { Goal } from "../models/Goal.js";
import { Habit } from "../models/Habit.js";
import { HabitCheckIn } from "../models/HabitCheckIn.js";
import { Note } from "../models/Note.js";
import { NoteFolder } from "../models/NoteFolder.js";
import { NoteVersion } from "../models/NoteVersion.js";
import { Transaction } from "../models/Transaction.js";
import { Budget } from "../models/Budget.js";
import { BudgetHistory } from "../models/BudgetHistory.js";
import { Category } from "../models/Category.js";
import { Subject } from "../models/Subject.js";
import { Topic } from "../models/Topic.js";
import { Flashcard } from "../models/Flashcard.js";
import { FocusSession } from "../models/FocusSession.js";
import { Conversation } from "../models/Conversation.js";
import { Message } from "../models/Message.js";
import { AiRequestLog } from "../models/AiRequestLog.js";
import { Embedding } from "../models/Embedding.js";
import { Summary } from "../models/Summary.js";
import { Recommendation } from "../models/Recommendation.js";
import { Notification } from "../models/Notification.js";
import { PushSubscription } from "../models/PushSubscription.js";
import { SyncTombstone } from "../models/SyncTombstone.js";
import { jobsQueue } from "./queue.js";
import { accountPurgeQueue } from "./accountPurgeQueue.js";
import { auditService } from "./auditService.js";
import { logger } from "../logger.js";

export interface PurgeResult {
  userId: string;
  purgedAt: Date;
  collectionsPurged: number;
  userDeleted: boolean;
}

/**
 * Removes any queued or delayed BullMQ jobs that reference this userId
 * to prevent delayed jobs from firing and recreating deleted data.
 */
async function cleanUserJobsFromQueues(userId: string): Promise<void> {
  try {
    const queues = [jobsQueue, accountPurgeQueue];
    for (const q of queues) {
      if (!q) continue;
      const delayedAndWaiting = await q.getJobs(["delayed", "waiting"]);
      for (const job of delayedAndWaiting) {
        if (
          job.data?.userId === userId ||
          job.data?.targetUserId === userId ||
          job.id?.includes(userId)
        ) {
          await job.remove().catch(() => {});
        }
      }
    }
  } catch (err) {
    logger.warn({ err, userId }, "Queue cleanup during account purge encountered a warning");
  }
}

/**
 * Executes a full cascade data purge for a user account across ALL 25 user-data collections,
 * revokes all sessions, removes background queue jobs, and deletes the User document.
 *
 * Preserves AuditLog records per statutory/security defense retention (90-day TTL),
 * which already store zero PII and anonymized IP addresses. Emits ACCOUNT_PERMANENTLY_PURGED.
 */
export async function purgeUserData(userId: string): Promise<PurgeResult> {
  const userObjectId = new Types.ObjectId(userId);
  const now = new Date();

  logger.info({ userId }, "Initiating full GDPR/DPDP cascade purge of user data");

  // 1. Cascade delete across all 25 user collections in parallel
  await Promise.all([
    RefreshToken.deleteMany({ userId: userObjectId }),
    Event.deleteMany({ userId: userObjectId }),
    Goal.deleteMany({ userId: userObjectId }),
    Habit.deleteMany({ userId: userObjectId }),
    HabitCheckIn.deleteMany({ userId: userObjectId }),
    Note.deleteMany({ userId: userObjectId }),
    NoteFolder.deleteMany({ userId: userObjectId }),
    NoteVersion.deleteMany({ userId: userObjectId }),
    Transaction.deleteMany({ userId: userObjectId }),
    Budget.deleteMany({ userId: userObjectId }),
    BudgetHistory.deleteMany({ userId: userObjectId }),
    Category.deleteMany({ userId: userObjectId }),
    Subject.deleteMany({ userId: userObjectId }),
    Topic.deleteMany({ userId: userObjectId }),
    Flashcard.deleteMany({ userId: userObjectId }),
    FocusSession.deleteMany({ userId: userObjectId }),
    Conversation.deleteMany({ userId: userObjectId }),
    Message.deleteMany({ userId: userObjectId }),
    AiRequestLog.deleteMany({ userId: { $in: [userObjectId, userId] } }),
    Embedding.deleteMany({ userId: userObjectId }),
    Summary.deleteMany({ userId: userObjectId }),
    Recommendation.deleteMany({ userId: userObjectId }),
    Notification.deleteMany({ userId: userObjectId }),
    PushSubscription.deleteMany({ userId: userObjectId }),
    SyncTombstone.deleteMany({ userId: userObjectId })
  ]);

  // 2. Cancel any pending/delayed BullMQ background jobs for this user
  await cleanUserJobsFromQueues(userId);

  // 3. Delete the root user record
  const deleteResult = await User.findByIdAndDelete(userObjectId);

  // 4. Record compliance audit log (tamper-resistant, immutable)
  try {
    await auditService.log(
      {
        action: "ACCOUNT_PERMANENTLY_PURGED",
        resourceType: "user",
        resourceId: userId,
        targetUserId: userId,
        actorRole: "system",
        outcome: "SUCCESS",
        metadata: {
          purgedAt: now.toISOString(),
          retentionPolicy: "30_day_purge_completed"
        }
      },
      { critical: true }
    );
  } catch (err) {
    logger.error({ err, userId }, "Failed to write ACCOUNT_PERMANENTLY_PURGED audit log");
  }

  logger.info({ userId }, "GDPR/DPDP cascade purge completed successfully");

  return {
    userId,
    purgedAt: now,
    collectionsPurged: 25,
    userDeleted: !!deleteResult
  };
}

/**
 * Identifies accounts eligible for permanent deletion based on the 30-day grace period.
 *
 * Supports injectable `asOfDate` to allow deterministic time simulation in automated tests.
 */
export async function purgeEligibleAccounts(
  asOfDate: Date = new Date(),
  retentionDays = 30
): Promise<number> {
  const cutoffDate = new Date(asOfDate.getTime() - retentionDays * 24 * 60 * 60 * 1000);

  const eligibleUsers = await User.find({
    status: "soft_deleted",
    deletedAt: { $lte: cutoffDate }
  }).select("_id");

  logger.info(
    { count: eligibleUsers.length, cutoffDate, asOfDate },
    "Running scheduled 30-day account purge sweep"
  );

  let purgedCount = 0;
  for (const user of eligibleUsers) {
    try {
      await purgeUserData(user._id.toString());
      purgedCount++;
    } catch (err) {
      logger.error({ err, userId: user._id.toString() }, "Failed to purge eligible user account");
    }
  }

  return purgedCount;
}
