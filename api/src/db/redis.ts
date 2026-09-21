import { Redis } from "ioredis";
import { env } from "../config/env.js";
import { logger } from "../logger.js";

export function createRedisClient(): Redis {
  const isTls = env.REDIS_URL.startsWith("rediss://");
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    keepAlive: 10000,
    connectTimeout: 10000,
    retryStrategy(times) {
      return Math.min(times * 200, 3000);
    },
    tls: isTls
      ? {
          rejectUnauthorized: false
        }
      : undefined
  });

  client.on("error", (err: any) => {
    logger.warn({ err: err?.message || err }, "Redis connection warning");
  });

  return client;
}

export const redis = createRedisClient();

redis.on("connect", () => {
  logger.info("Connected to Redis");
});

