import { redis } from "../../db/redis.js";
import { logger } from "../../logger.js";

export interface RateLimitConfig {
  requestsPerDay: number;
}

export const TIER_LIMITS: Record<string, RateLimitConfig> = {
  free: { requestsPerDay: 20 },
  pro: { requestsPerDay: 500 }
};

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
  currentCount: number;
}

/**
  Calculates seconds remaining until midnight UTC for key TTL.
 */
function getSecondsUntilMidnightUTC(): number {
  const now = new Date();
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
  return Math.max(1, Math.floor((midnight.getTime() - now.getTime()) / 1000));
}

/**
 * Calculates Date of midnight UTC when quota resets.
 */
function getResetDateUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
}

/**
 * Formats current UTC date string YYYY-MM-DD for Redis key isolation.
 */
function getUTCDateString(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

/**
 * Checks and increments Redis rate limit key per user and day.
 */
export async function checkAiRateLimit(
  userId: string,
  tier: string = "free",
  overrideLimit?: number
): Promise<RateLimitResult> {
  const dateStr = getUTCDateString();
  const key = `ratelimit:ai:${userId}:${dateStr}`;
  const tierConfig = TIER_LIMITS[tier] || TIER_LIMITS.free;
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
      logger.warn({ userId, tier, currentCount, limit, resetAt }, "AI rate limit exceeded for user");
    }

    return {
      allowed,
      limit,
      remaining,
      resetAt,
      currentCount
    };
  } catch (err) {
    logger.warn({ err, userId }, "Redis error in AI rate limiter; bypassing check");
    // Fallback gracefully if Redis is temporarily unreachable in dev/test
    return {
      allowed: true,
      limit,
      remaining: limit,
      resetAt,
      currentCount: 0
    };
  }
}
