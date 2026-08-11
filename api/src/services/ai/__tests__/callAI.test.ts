import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("../../../db/redis.js", () => {
  const store = new Map<string, number>();
  return {
    redis: {
      incr: vi.fn(async (key: string) => {
        const val = (store.get(key) || 0) + 1;
        store.set(key, val);
        return val;
      }),
      expire: vi.fn(async () => 1),
      ttl: vi.fn(async () => 86400),
      _clear: () => store.clear()
    }
  };
});

vi.mock("../../../models/User.js", () => ({
  User: {
    findById: vi.fn().mockImplementation((id: string) => ({
      select: () => ({
        lean: async () => ({
          _id: id,
          subscriptionTier: id.includes("pro") ? "pro" : "free"
        })
      })
    }))
  }
}));

vi.mock("../../../models/AiRequestLog.js", () => ({
  AiRequestLog: {
    create: vi.fn().mockResolvedValue({}),
    countDocuments: vi.fn().mockResolvedValue(0)
  }
}));

vi.mock("../../queue.ts", () => ({
  enqueueJob: vi
    .fn()
    .mockResolvedValue({ queued: true, duplicate: false, jobId: "mock-retry-job-id" })
}));

import { callAI, getProviderOrder } from "../callAI.js";
import * as providersModule from "../providers.js";
import { enqueueJob } from "../../queue.js";
import { redis } from "../../../db/redis.js";

describe("callAI Infrastructure Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (redis as any)._clear();
  });

  describe("getProviderOrder", () => {
    it("returns default priority order: mistral, groq, gemini", () => {
      const order = getProviderOrder();
      expect(order).toEqual(["mistral", "groq", "gemini"]);
    });

    it("respects custom provider order override", () => {
      const order = getProviderOrder(["groq", "mistral"]);
      expect(order).toEqual(["groq", "mistral"]);
    });
  });

  describe("Provider Fallback Chain (FR-2.10, FR-2.11)", () => {
    it("falls through from Mistral failure to Groq when Mistral fails", async () => {
      vi.spyOn(providersModule, "executeProviderWithRetry").mockImplementation(
        async (provider, _messages, _opts) => {
          if (provider === "mistral") {
            return {
              success: false,
              content: null,
              provider: "mistral",
              durationMs: 100,
              tokensIn: 0,
              tokensOut: 0,
              attempts: [
                {
                  provider: "mistral",
                  success: false,
                  durationMs: 50,
                  errorType: "auth_error",
                  errorMessage: "Invalid API Key"
                },
                {
                  provider: "mistral",
                  success: false,
                  durationMs: 50,
                  errorType: "auth_error",
                  errorMessage: "Invalid API Key"
                }
              ],
              lastErrorType: "auth_error",
              lastErrorMessage: "Invalid API Key"
            };
          }
          if (provider === "groq") {
            return {
              success: true,
              content: "Hello from Groq fallback!",
              provider: "groq",
              durationMs: 120,
              tokensIn: 10,
              tokensOut: 20,
              attempts: [{ provider: "groq", success: true, durationMs: 120 }]
            };
          }
          throw new Error("Gemini should not be called when Groq succeeds");
        }
      );

      const res = await callAI([{ role: "user", content: "Hi" }], {
        userId: "user-123",
        bypassRateLimit: true
      });

      expect(res.success).toBe(true);
      expect(res.providerServed).toBe("groq");
      expect(res.fallbackOccurred).toBe(true);
      expect(res.content).toBe("Hello from Groq fallback!");
    });

    it("falls through to Gemini when both Mistral and Groq fail", async () => {
      vi.spyOn(providersModule, "executeProviderWithRetry").mockImplementation(
        async (provider, _messages, _opts) => {
          if (provider === "mistral" || provider === "groq") {
            return {
              success: false,
              content: null,
              provider,
              durationMs: 100,
              tokensIn: 0,
              tokensOut: 0,
              attempts: [
                {
                  provider,
                  success: false,
                  durationMs: 100,
                  errorType: "timeout",
                  errorMessage: "Request timed out"
                }
              ],
              lastErrorType: "timeout"
            };
          }
          return {
            success: true,
            content: "Hello from Gemini ultimate fallback!",
            provider: "gemini",
            durationMs: 200,
            tokensIn: 15,
            tokensOut: 30,
            attempts: [{ provider: "gemini", success: true, durationMs: 200 }]
          };
        }
      );

      const res = await callAI([{ role: "user", content: "Test prompt" }], {
        userId: "user-123",
        bypassRateLimit: true
      });

      expect(res.success).toBe(true);
      expect(res.providerServed).toBe("gemini");
      expect(res.fallbackOccurred).toBe(true);
      expect(res.content).toBe("Hello from Gemini ultimate fallback!");
    });
  });

  describe("Total Failure Path (FR-2.13)", () => {
    it("returns a graceful error without throwing when all 3 providers fail", async () => {
      vi.spyOn(providersModule, "executeProviderWithRetry").mockImplementation(
        async (provider) => ({
          success: false,
          content: null,
          provider,
          durationMs: 100,
          tokensIn: 0,
          tokensOut: 0,
          attempts: [
            {
              provider,
              success: false,
              durationMs: 100,
              errorType: "api_error",
              errorMessage: "Service Down"
            }
          ]
        })
      );

      const res = await callAI([{ role: "user", content: "Live sync prompt" }], {
        userId: "user-123",
        isAsyncContext: false,
        bypassRateLimit: true
      });

      expect(res.success).toBe(false);
      expect(res.content).toBeNull();
      expect(res.error).toBe("AI service is currently unavailable. Please try again shortly.");
      expect(res.queuedForRetry).toBe(false);
      expect(enqueueJob).not.toHaveBeenCalled();
    });

    it("enqueues a retry job via enqueueJob when isAsyncContext is true on total failure", async () => {
      vi.spyOn(providersModule, "executeProviderWithRetry").mockImplementation(
        async (provider) => ({
          success: false,
          content: null,
          provider,
          durationMs: 100,
          tokensIn: 0,
          tokensOut: 0,
          attempts: [
            {
              provider,
              success: false,
              durationMs: 100,
              errorType: "api_error",
              errorMessage: "Service Down"
            }
          ]
        })
      );

      const res = await callAI([{ role: "user", content: "Generate daily summary" }], {
        userId: "user-123",
        requestType: "daily_summary",
        isAsyncContext: true,
        bypassRateLimit: true
      });

      expect(res.success).toBe(false);
      expect(res.queuedForRetry).toBe(true);
      expect(enqueueJob).toHaveBeenCalledWith(
        "ai_retry_job",
        expect.objectContaining({
          userId: "user-123",
          requestType: "daily_summary"
        })
      );
    });
  });

  describe("Rate Limiting per Subscription Tier (FR-2.8)", () => {
    it("enforces tier limits and blocks requests exceeding daily quota", async () => {
      vi.spyOn(providersModule, "executeProviderWithRetry").mockResolvedValue({
        success: true,
        content: "OK",
        provider: "mistral",
        durationMs: 50,
        tokensIn: 5,
        tokensOut: 5,
        attempts: [{ provider: "mistral", success: true, durationMs: 50 }]
      });

      // Free tier limit is 20. We pass custom limit of 2 for fast test execution.
      const opts = { userId: "user-free-123", subscriptionTier: "free" as const };

      // Call 1
      const res1 = await callAI([{ role: "user", content: "req 1" }], { ...opts, timeoutMs: 9000 });
      expect(res1.success).toBe(true);

      // We simulate reaching limit using redis incr
      const dateStr = new Date().toISOString().split("T")[0];
      const key = `ratelimit:ai:user-free-123:${dateStr}`;
      // Set to 20 (max limit for free)
      await redis.incr(key); // count = 2
      for (let i = 0; i < 18; i++) {
        await redis.incr(key); // bring count up to 20
      }

      // Call 21 (should be blocked)
      const resBlocked = await callAI([{ role: "user", content: "req 21" }], opts);
      expect(resBlocked.success).toBe(false);
      expect(resBlocked.isRateLimited).toBe(true);
      expect(resBlocked.remaining).toBe(0);
      expect(resBlocked.error).toContain("AI rate limit exceeded");
      expect(resBlocked.resetAt).toBeDefined();
    });
  });
});
