import { redis } from "../../db/redis.js";
import { logger } from "../../logger.js";

export interface OcrRateLimitConfig {
  requestsPerDay: number;
}

export const OCR_TIER_LIMITS: Record<string, OcrRateLimitConfig> = {
  free: { requestsPerDay: 30 },
  pro: { requestsPerDay: 500 }
};

export interface OcrRateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
  currentCount: number;
}

/**
 * Calculates seconds remaining until midnight UTC for Redis key TTL.
 */
function getSecondsUntilMidnightUTC(): number {
  const now = new Date();
  const midnight = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0)
  );
  return Math.max(1, Math.floor((midnight.getTime() - now.getTime()) / 1000));
}

/**
 * Calculates Date of midnight UTC when quota resets.
 */
function getResetDateUTC(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0)
  );
}

/**
 * Formats current UTC date string YYYY-MM-DD for Redis key isolation.
 */
function getUTCDateString(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

/**
 * Checks and increments Redis rate limit key per user and day for OCR extraction.
 */
export async function checkOcrRateLimit(
  userId: string,
  tier: string = "free",
  overrideLimit?: number
): Promise<OcrRateLimitResult> {
  const dateStr = getUTCDateString();
  const key = `ratelimit:ocr:${userId}:${dateStr}`;
  const tierConfig = OCR_TIER_LIMITS[tier] || OCR_TIER_LIMITS.free;
  const limit = overrideLimit ?? tierConfig.requestsPerDay;
  const resetAt = getResetDateUTC();

  try {
    const currentCount = await redis.incr(key);

    if (currentCount === 1) {
      const ttl = getSecondsUntilMidnightUTC();
      await redis.expire(key, ttl);
    }

    const remaining = Math.max(0, limit - currentCount);
    const allowed = currentCount <= limit;

    if (!allowed) {
      logger.warn(
        { userId, tier, currentCount, limit, resetAt },
        "OCR rate limit exceeded for user"
      );
    }

    return {
      allowed,
      limit,
      remaining,
      resetAt,
      currentCount
    };
  } catch (err) {
    logger.warn({ err, userId }, "Redis error in OCR rate limiter; bypassing check");
    return {
      allowed: true,
      limit,
      remaining: limit,
      resetAt,
      currentCount: 0
    };
  }
}
