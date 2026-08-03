import type { NextFunction, Request, Response } from "express";
import { redis } from "../db/redis.js";
import { logger } from "../logger.js";

const WINDOW_SECONDS = 15 * 60; // 15 minutes
const MAX_ATTEMPTS = 5;

export async function loginRateLimiter(req: Request, res: Response, next: NextFunction) {
  try {
    const ip = req.ip || req.socket.remoteAddress || "unknown_ip";
    const email = (req.body?.email || "unknown_email").toString().toLowerCase().trim();
    const key = `ratelimit:login:${ip}:${email}`;

    // Increments key and sets expiration if new
    const attempts = await redis.incr(key);
    if (attempts === 1) {
      await redis.expire(key, WINDOW_SECONDS);
    }

    if (attempts > MAX_ATTEMPTS) {
      const ttl = await redis.ttl(key);
      res.setHeader("Retry-After", ttl > 0 ? ttl : WINDOW_SECONDS);
      return res.status(429).json({
        error: "TooManyRequests",
        message: "Too many failed login attempts. Please try again after 15 minutes."
      });
    }

    next();
  } catch (err) {
    // If Redis is unreachable or errored, log error and allow request to proceed
    logger.warn({ err }, "Redis rate limiter bypassed due to connection error");
    next();
  }
}
