import type { NextFunction, Request, Response } from "express";
import { redis } from "../../db/redis.js";
import { logger } from "../../logger.js";

const EXPORT_WINDOW_SECONDS = 3600; // 1 hour
const MAX_EXPORT_REQUESTS_PER_HOUR = 20;

export interface ExportRateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Checks Redis rate limit for analytics export generation per user.
 */
export async function checkExportRateLimit(
  userId: string,
  limit: number = MAX_EXPORT_REQUESTS_PER_HOUR
): Promise<ExportRateLimitResult> {
  const now = new Date();
  // Group into 1-hour window buckets
  const hourKey = `${now.toISOString().split("T")[0]}-${now.getUTCHours()}`;
  const key = `ratelimit:export:${userId}:${hourKey}`;

  // Fail open immediately if Redis is defined and not ready
  if (redis.status !== undefined && redis.status !== "ready") {
    logger.warn({ userId, status: redis.status }, "Redis not ready; bypassing export rate limiter");
    return {
      allowed: true,
      limit,
      remaining: limit,
      retryAfterSeconds: 0
    };
  }

  try {
    const incrPromise = redis.incr(key);
    const timeoutPromise = new Promise<number>((_, reject) =>
      setTimeout(() => reject(new Error("Redis export rate limiter timed out")), 1000)
    );

    const currentCount = await Promise.race([incrPromise, timeoutPromise]);

    if (currentCount === 1) {
      await redis.expire(key, EXPORT_WINDOW_SECONDS).catch(() => {});
    }

    const ttl = await Promise.race([
      redis.ttl(key),
      new Promise<number>((resolve) => setTimeout(() => resolve(EXPORT_WINDOW_SECONDS), 500))
    ]).catch(() => EXPORT_WINDOW_SECONDS);

    const retryAfterSeconds = ttl > 0 ? ttl : EXPORT_WINDOW_SECONDS;
    const remaining = Math.max(0, limit - currentCount);
    const allowed = currentCount <= limit;

    if (!allowed) {
      logger.warn(
        { userId, currentCount, limit, retryAfterSeconds },
        "Analytics export rate limit exceeded"
      );
    }

    return {
      allowed,
      limit,
      remaining,
      retryAfterSeconds
    };
  } catch (err) {
    logger.warn({ err, userId }, "Redis error in export rate limiter; allowing request");
    return {
      allowed: true,
      limit,
      remaining: limit,
      retryAfterSeconds: 0
    };
  }
}

/**
 * Express middleware for analytics export rate limiting.
 */
export async function exportRateLimiter(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id || req.user?._id?.toString();
  if (!userId) {
    return next();
  }

  const result = await checkExportRateLimit(userId);
  if (!result.allowed) {
    res.setHeader("Retry-After", result.retryAfterSeconds);
    return res.status(429).json({
      error: "TooManyRequests",
      message: `Export rate limit exceeded. Maximum ${result.limit} exports per hour allowed. Please retry in ${result.retryAfterSeconds} seconds.`
    });
  }

  next();
}
