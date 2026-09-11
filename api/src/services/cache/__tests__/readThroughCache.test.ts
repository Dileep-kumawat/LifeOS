import { describe, it, expect, vi, beforeEach } from "vitest";

// In-memory Redis simulation
const inMemoryRedis = new Map<string, string>();

vi.mock("../../../db/redis.js", () => ({
  redis: {
    get: vi.fn().mockImplementation(async (key: string) => inMemoryRedis.get(key) ?? null),
    set: vi.fn().mockImplementation(async (key: string, val: string, _ex?: string, _ttl?: number) => {
      inMemoryRedis.set(key, val);
      return "OK";
    })
  }
}));

vi.mock("../../../logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

import { redis } from "../../../db/redis.js";
import { logger } from "../../../logger.js";
import {
  getOrSetCache,
  resetCacheMetrics,
  getCacheMetrics,
  CACHE_TTL_SECONDS
} from "../readThroughCache.js";

describe("readThroughCache Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    inMemoryRedis.clear();
    resetCacheMetrics();
  });

  it("misses cache on first call, calls fetchFn, populates Redis, and logs cache miss", async () => {
    const fetchFn = vi.fn().mockResolvedValue({ status: "success", count: 42 });
    const cacheKey = "cache:test:user1:2026-08-01:2026-08-07";

    const result = await getOrSetCache(cacheKey, CACHE_TTL_SECONDS, fetchFn);

    expect(result).toEqual({ status: "success", count: 42 });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(redis.get).toHaveBeenCalledWith(cacheKey);
    expect(redis.set).toHaveBeenCalledWith(
      cacheKey,
      JSON.stringify({ status: "success", count: 42 }),
      "EX",
      300
    );

    const metrics = getCacheMetrics();
    expect(metrics.misses).toBe(1);
    expect(metrics.hits).toBe(0);

    // Verify structured Pino log for miss
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        cacheKey,
        hit: false,
        hits: 0,
        misses: 1
      }),
      "Cache miss"
    );
  });

  it("hits cache on second call within TTL without invoking fetchFn, and logs cache hit", async () => {
    const fetchFn = vi.fn().mockResolvedValue({ data: "from-mongo" });
    const cacheKey = "cache:test:user1:2026-08-01:2026-08-07";

    // First call (miss)
    const firstResult = await getOrSetCache(cacheKey, CACHE_TTL_SECONDS, fetchFn);
    expect(firstResult).toEqual({ data: "from-mongo" });
    expect(fetchFn).toHaveBeenCalledTimes(1);

    // Second call (hit)
    const secondResult = await getOrSetCache(cacheKey, CACHE_TTL_SECONDS, fetchFn);
    expect(secondResult).toEqual({ data: "from-mongo" });
    // fetchFn must NOT be called again
    expect(fetchFn).toHaveBeenCalledTimes(1);

    const metrics = getCacheMetrics();
    expect(metrics.misses).toBe(1);
    expect(metrics.hits).toBe(1);

    // Verify structured Pino log for hit
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        cacheKey,
        hit: true,
        hits: 1,
        misses: 1
      }),
      "Cache hit"
    );
  });

  it("falls back to fetchFn gracefully when Redis get throws an error", async () => {
    vi.mocked(redis.get).mockRejectedValueOnce(new Error("Redis connection refused"));
    const fetchFn = vi.fn().mockResolvedValue({ fallback: true });
    const cacheKey = "cache:test:user1:2026-08-01:2026-08-07";

    const result = await getOrSetCache(cacheKey, CACHE_TTL_SECONDS, fetchFn);

    expect(result).toEqual({ fallback: true });
    expect(fetchFn).toHaveBeenCalledTimes(1);

    const metrics = getCacheMetrics();
    expect(metrics.errors).toBe(1);
    expect(metrics.misses).toBe(1);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        err: "Redis connection refused",
        cacheKey
      }),
      "Redis cache read error; falling back to direct aggregation"
    );
  });

  it("returns result gracefully when Redis set throws an error", async () => {
    vi.mocked(redis.set).mockRejectedValueOnce(new Error("Redis write timeout"));
    const fetchFn = vi.fn().mockResolvedValue({ saved: true });
    const cacheKey = "cache:test:user1:2026-08-01:2026-08-07";

    const result = await getOrSetCache(cacheKey, CACHE_TTL_SECONDS, fetchFn);

    expect(result).toEqual({ saved: true });
    expect(fetchFn).toHaveBeenCalledTimes(1);

    const metrics = getCacheMetrics();
    expect(metrics.errors).toBe(1);

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        err: "Redis write timeout",
        cacheKey
      }),
      "Redis cache write error; proceeding without caching"
    );
  });
});
