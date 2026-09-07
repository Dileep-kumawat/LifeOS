import { Redis } from "ioredis";
import { env } from "../config/env.js";
import { logger } from "../logger.js";

export function createRedisClient(): Redis {
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    lazyConnect: true
  });

  client.on("error", (err) => {
    logger.warn({ err }, "Redis connection warning");
  });

  return client;
}

export const redis = createRedisClient();

redis.on("connect", () => {
  logger.info("Connected to Redis");
});

