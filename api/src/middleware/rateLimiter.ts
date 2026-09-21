import type { NextFunction, Request, Response } from "express";
import { redis } from "../db/redis.js";
import { logger } from "../logger.js";

interface RateLimiterOptions {
  keyPrefix: string;
  windowSeconds: number;
  maxAttempts: number;
  message: string;
  keyGenerator?: (req: Request) => string;
}

/**
 * Creates a reusable Redis sliding/fixed-window rate limiting Express middleware.
 */
export function createRedisRateLimiter(options: RateLimiterOptions) {
  const { keyPrefix, windowSeconds, maxAttempts, message, keyGenerator } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // If Redis is not currently ready, fail open immediately so requests are never blocked
    if (redis.status !== "ready") {
      logger.warn({ keyPrefix, status: redis.status }, "Redis not ready; bypassing rate limiter");
      return next();
    }

    try {
      const ip = req.ip || req.socket.remoteAddress || "unknown_ip";
      const customKey = keyGenerator ? keyGenerator(req) : ip;
      const key = `ratelimit:${keyPrefix}:${customKey}`;

      // Enforce a strict 1-second timeout so a reconnecting or stalled Redis never hangs HTTP requests
      const incrPromise = redis.incr(key);
      const timeoutPromise = new Promise<number>((_, reject) =>
        setTimeout(() => reject(new Error("Redis rate limiter timed out")), 1000)
      );

      const attempts = await Promise.race([incrPromise, timeoutPromise]);
      if (attempts === 1) {
        await redis.expire(key, windowSeconds).catch(() => {});
      }

      if (attempts > maxAttempts) {
        const ttl = await redis.ttl(key).catch(() => windowSeconds);
        const retryAfter = ttl > 0 ? ttl : windowSeconds;
        res.setHeader("Retry-After", retryAfter);
        return res.status(429).json({
          error: "TooManyRequests",
          message,
          retryAfter
        });
      }

      next();
    } catch (err) {
      // If Redis is unreachable, times out, or errors, log warning and fail open so legitimate traffic is not blocked
      logger.warn({ err, keyPrefix }, "Redis rate limiter error; bypassing check");
      next();
    }
  };
}

/**
 * Rate limit login attempts: 5 requests per 15 minutes per IP + email combo.
 */
export const loginRateLimiter = createRedisRateLimiter({
  keyPrefix: "login",
  windowSeconds: 15 * 60,
  maxAttempts: 5,
  message: "Too many login attempts. Please try again after 15 minutes.",
  keyGenerator: (req) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown_ip";
    const email = (req.body?.email || "unknown_email").toString().toLowerCase().trim();
    return `${ip}:${email}`;
  }
});

/**
 * Rate limit registration attempts: 5 registrations per 15 minutes per IP.
 */
export const registerRateLimiter = createRedisRateLimiter({
  keyPrefix: "register",
  windowSeconds: 15 * 60,
  maxAttempts: 5,
  message: "Too many registration attempts from this IP. Please try again after 15 minutes."
});

/**
 * Rate limit password reset requests: 3 requests per 15 minutes per IP + email.
 */
export const forgotPasswordRateLimiter = createRedisRateLimiter({
  keyPrefix: "forgot_password",
  windowSeconds: 15 * 60,
  maxAttempts: 3,
  message: "Too many password reset requests. Please try again after 15 minutes.",
  keyGenerator: (req) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown_ip";
    const email = (req.body?.email || "unknown_email").toString().toLowerCase().trim();
    return `${ip}:${email}`;
  }
});

/**
 * Rate limit password reset token verification / updates: 5 attempts per 15 minutes per IP.
 */
export const resetPasswordRateLimiter = createRedisRateLimiter({
  keyPrefix: "reset_password",
  windowSeconds: 15 * 60,
  maxAttempts: 5,
  message: "Too many password reset attempts. Please try again after 15 minutes."
});

/**
 * Rate limit token refresh requests: 60 refreshes per 15 minutes per IP.
 */
export const refreshRateLimiter = createRedisRateLimiter({
  keyPrefix: "refresh",
  windowSeconds: 15 * 60,
  maxAttempts: 60,
  message: "Too many token refresh requests. Please try again shortly."
});

/**
 * Baseline API rate limiter: 120 requests per minute per IP / authenticated user.
 */
export const generalApiRateLimiter = createRedisRateLimiter({
  keyPrefix: "general_api",
  windowSeconds: 60,
  maxAttempts: 120,
  message: "API rate limit exceeded. Please slow down your requests.",
  keyGenerator: (req) => {
    const userId = (req as any).user?._id?.toString();
    const ip = req.ip || req.socket.remoteAddress || "unknown_ip";
    return userId ? `user:${userId}` : `ip:${ip}`;
  }
});

/**
 * Admin portal rate limiter: 60 requests per minute per admin user.
 */
export const adminRateLimiter = createRedisRateLimiter({
  keyPrefix: "admin_portal",
  windowSeconds: 60,
  maxAttempts: 60,
  message: "Admin API rate limit exceeded. Please slow down administrative requests.",
  keyGenerator: (req) => {
    const userId = (req as any).user?._id?.toString();
    const ip = req.ip || req.socket.remoteAddress || "unknown_ip";
    return userId ? `admin:${userId}` : `ip:${ip}`;
  }
});

/**
 * Admin audit log viewer rate limiter: 30 requests per minute per admin user.
 */
export const adminAuditRateLimiter = createRedisRateLimiter({
  keyPrefix: "admin_audit",
  windowSeconds: 60,
  maxAttempts: 30,
  message: "Audit log rate limit exceeded. Maximum 30 queries per minute.",
  keyGenerator: (req) => {
    const userId = (req as any).user?._id?.toString();
    const ip = req.ip || req.socket.remoteAddress || "unknown_ip";
    return userId ? `admin_audit:${userId}` : `ip:${ip}`;
  }
});

/**
 * User data portability export rate limiter: 5 requests per hour per user.
 */
export const userDataExportRateLimiter = createRedisRateLimiter({
  keyPrefix: "user_export",
  windowSeconds: 60 * 60,
  maxAttempts: 5,
  message: "Data export rate limit exceeded. Maximum 5 complete exports per hour.",
  keyGenerator: (req) => {
    const userId = (req as any).user?._id?.toString();
    const ip = req.ip || req.socket.remoteAddress || "unknown_ip";
    return userId ? `export:${userId}` : `ip:${ip}`;
  }
});
