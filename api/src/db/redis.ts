import { Redis } from "ioredis";
import { env } from "../config/env.js";
import { logger } from "../logger.js";

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  lazyConnect: true
});

redis.on("connect", () => {
  logger.info("Connected to Redis");
});

redis.on("error", (err) => {
  logger.warn({ err }, "Redis connection warning");
});
