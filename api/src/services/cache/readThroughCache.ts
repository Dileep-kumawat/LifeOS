import { redis } from "../../db/redis.js";
import { logger } from "../../logger.js";

/**
 * Default cache time-to-live for expensive aggregation queries: 5 minutes (300 seconds).
 */
export const CACHE_TTL_SECONDS = 300;

export interface CacheMetrics {
  hits: number;
  misses: number;
  errors: number;
}

/**
 * In-memory counters tracking cache operations for Pino structured telemetry.
 */
export const cacheMetrics: CacheMetrics = {
  hits: 0,
  misses: 0,
  errors: 0
};

export function resetCacheMetrics(): void {
  cacheMetrics.hits = 0;
  cacheMetrics.misses = 0;
  cacheMetrics.errors = 0;
}

export function getCacheMetrics(): Readonly<CacheMetrics> {
  return { ...cacheMetrics };
}

/**
 * Read-through caching wrapper for expensive, non-real-time-critical aggregation reads.
 *
 * Cache Invalidation Tradeoff:
 * Any write to the underlying collections (transactions, habit check-ins, focus sessions)
 * in the relevant date range does not perform synchronous cache invalidation given the 5-minute TTL.
 * Real-time consistency is intentionally traded for query throughput on heavy multi-collection
 * MongoDB aggregation pipelines. In addition, write endpoints in LifeOS currently do not emit
 * domain events, so synchronous invalidation is deliberately bypassed in favor of natural TTL
 * expiration.
 *
 * Fault Tolerance:
 * All Redis operations are wrapped in try/catch blocks. If Redis is unreachable, errors,
 * or experiences a connection failure, the error is logged as a warning and the operation
 * transparently falls back to executing the underlying MongoDB aggregation (fetchFn) without
 * erroring the user request.
 *
 * @param key Cache key string
 * @param ttlSeconds Expiration in seconds (default: 300 / 5 minutes)
 * @param fetchFn Asynchronous fallback function querying MongoDB
 */
export async function getOrSetCache<T>(
  key: string,
  ttlSeconds: number = CACHE_TTL_SECONDS,
  fetchFn: () => Promise<T>
): Promise<T> {
  const withCacheTimeout = <V>(promise: Promise<V>, ms = 1000): Promise<V> => {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Redis cache op timed out after ${ms}ms`)), ms)
    );
    return Promise.race([promise, timeout]);
  };

  // Fast fail-open: with `maxRetriesPerRequest: null`, awaiting Redis while it
  // is reconnecting hangs forever. Skip the cache entirely when not ready.
  // NOTE: mocked Redis clients in unit tests have no `status` field — treat
  // `undefined` as usable so cache hit/miss tests still run.
  const redisReady = redis.status === undefined || redis.status === "ready";
  if (!redisReady) {
    logger.warn({ cacheKey: key, status: redis.status }, "Redis not ready; skipping cache");
  }

  // 1. Attempt reading from Redis cache
  if (redisReady) {
    try {
      const cached = await withCacheTimeout(redis.get(key));
      if (cached !== null && cached !== undefined) {
        cacheMetrics.hits++;
        logger.info(
          { cacheKey: key, hit: true, hits: cacheMetrics.hits, misses: cacheMetrics.misses },
          "Cache hit"
        );
        return JSON.parse(cached) as T;
      }
    } catch (err: any) {
      cacheMetrics.errors++;
      logger.warn(
        { err: err?.message || err, cacheKey: key },
        "Redis cache read error; falling back to direct aggregation"
      );
    }
  }

  // 2. Cache miss or Redis read error: execute direct query
  cacheMetrics.misses++;
  logger.info(
    { cacheKey: key, hit: false, hits: cacheMetrics.hits, misses: cacheMetrics.misses },
    "Cache miss"
  );

  const result = await fetchFn();

  // 3. Attempt writing back to Redis cache with TTL
  if (redisReady) {
    try {
      await withCacheTimeout(redis.set(key, JSON.stringify(result), "EX", ttlSeconds));
    } catch (err: any) {
      cacheMetrics.errors++;
      logger.warn(
        { err: err?.message || err, cacheKey: key },
        "Redis cache write error; proceeding without caching"
      );
    }
  }

  return result;
}
