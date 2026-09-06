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
    try {
      const ip = req.ip || req.socket.remoteAddress || "unknown_ip";
      const customKey = keyGenerator ? keyGenerator(req) : ip;
      const key = `ratelimit:${keyPrefix}:${customKey}`;

      const attempts = await redis.incr(key);
      if (attempts === 1) {
        await redis.expire(key, windowSeconds);
      }

      if (attempts > maxAttempts) {
        const ttl = await redis.ttl(key);
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
      // If Redis is unreachable, log warning and fail open so legitimate traffic is not blocked
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
