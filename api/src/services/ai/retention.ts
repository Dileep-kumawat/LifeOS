import { AiRequestLog } from "../../models/AiRequestLog.js";
import { Message } from "../../models/Message.js";
import { logger } from "../../logger.js";

/** Default raw content retention window in days (90 days per FR-2.7 / NFR-6.2) */
export const RAW_CONTENT_RETENTION_DAYS = 90;

/**
 * Anonymizes/truncates raw AI chat content and request logs older than `retentionDays`.
 * Preserves operational metadata (provider, latency, token usage, timestamp, status).
 */
export async function sanitizeExpiredAiLogs(retentionDays = RAW_CONTENT_RETENTION_DAYS): Promise<{
  sanitizedLogsCount: number;
  sanitizedMessagesCount: number;
}> {
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  let sanitizedLogsCount = 0;
  let sanitizedMessagesCount = 0;

  try {
    // 1. Sanitize AiRequestLog records older than cutoffDate that have failureReason or raw details
    const logResult = await AiRequestLog.updateMany(
      {
        timestamp: { $lt: cutoffDate },
        failureReason: { $nin: ["<anonymized_after_retention_period>", null] }
      },
      { $set: { failureReason: "<anonymized_after_retention_period>" } }
    );
    sanitizedLogsCount = logResult.modifiedCount;

    // 2. Truncate raw chat content for messages older than cutoffDate
    const msgResult = await Message.updateMany(
      { createdAt: { $lt: cutoffDate }, content: { $ne: "<content_redacted_after_90_days>" } },
      { $set: { content: "<content_redacted_after_90_days>" } }
    );
    sanitizedMessagesCount = msgResult.modifiedCount;

    logger.info(
      { cutoffDate, sanitizedLogsCount, sanitizedMessagesCount },
      "AI interaction sensitive content retention purge executed successfully"
    );
  } catch (err) {
    logger.error({ err }, "Failed to execute AI interaction retention sanitization job");
  }

  return { sanitizedLogsCount, sanitizedMessagesCount };
}
