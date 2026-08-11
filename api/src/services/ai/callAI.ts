import { BaseMessage } from "@langchain/core/messages";
import { env } from "../../config/env.js";
import { logger } from "../../logger.js";
import { User } from "../../models/User.js";
import { AiRequestLog, type FallbackAttempt } from "../../models/AiRequestLog.js";
import { checkAiRateLimit } from "./rateLimiter.js";
import {
  executeProviderWithRetry,
  checkFreeTierCeilings,
  normalizeMessages,
  type MessageInput,
  type ProviderName
} from "./providers.js";
import { enqueueJob } from "../queue.js";

export interface CallAIOptions {
  userId: string;
  subscriptionTier?: "free" | "pro";
  requestType?: string;
  isAsyncContext?: boolean;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  providerOrder?: ProviderName[];
  bypassRateLimit?: boolean;
  modelOverrides?: Partial<Record<ProviderName, string>>;
  apiKeyOverrides?: Partial<Record<ProviderName, string>>;
}

export interface CallAIResponse {
  success: boolean;
  content: string | null;
  providerServed?: ProviderName;
  fallbackOccurred?: boolean;
  latencyMs?: number;
  tokensIn?: number;
  tokensOut?: number;
  attempts?: FallbackAttempt[];
  error?: string;
  isRateLimited?: boolean;
  resetAt?: Date;
  limit?: number;
  remaining?: number;
  queuedForRetry?: boolean;
}

/**
 * Parses and validates provider order from config or option override.
 */
export function getProviderOrder(override?: ProviderName[]): ProviderName[] {
  if (override && override.length > 0) return override;

  const rawConfig = env.AI_PROVIDER_ORDER || "mistral,groq,gemini";
  const parsed = rawConfig
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is ProviderName => s === "mistral" || s === "groq" || s === "gemini");

  return parsed.length > 0 ? parsed : ["mistral", "groq", "gemini"];
}

/**
 * The single internal service entry point for all AI calls in LifeOS.
 * Handles rate limiting, multi-provider fallback (Mistral -> Groq -> Gemini),
 * timeouts, structured logging to AiRequestLog, and background retry queuing.
 */
export async function callAI(
  messages: (MessageInput | BaseMessage)[],
  options: CallAIOptions
): Promise<CallAIResponse> {
  const startTime = Date.now();
  const {
    userId,
    requestType = "general",
    isAsyncContext = false,
    temperature,
    maxTokens,
    timeoutMs,
    bypassRateLimit = false,
    modelOverrides = {},
    apiKeyOverrides = {}
  } = options;

  // 1. Determine user subscription tier if not explicitly passed
  let tier: "free" | "pro" = options.subscriptionTier ?? "free";
  if (!options.subscriptionTier && userId) {
    try {
      const user = await User.findById(userId).select("subscriptionTier").lean();
      if (user?.subscriptionTier === "pro") {
        tier = "pro";
      }
    } catch (err) {
      logger.debug({ err, userId }, "Failed to fetch user tier; defaulting to free");
    }
  }

  // 2. Rate Limit Check
  if (!bypassRateLimit && userId) {
    const rateLimit = await checkAiRateLimit(userId, tier);
    if (!rateLimit.allowed) {
      await AiRequestLog.create({
        userId,
        requestType,
        providerServed: null,
        fallbackOccurred: false,
        fallbackChain: [],
        latencyMs: Date.now() - startTime,
        tokensIn: 0,
        tokensOut: 0,
        status: "rate_limited",
        failureReason: `Rate limit exceeded for tier "${tier}" (${rateLimit.limit} req/day)`
      });

      return {
        success: false,
        content: null,
        error: `AI rate limit exceeded for your subscription tier (${tier}). Quota resets at ${rateLimit.resetAt.toISOString()}.`,
        isRateLimited: true,
        resetAt: rateLimit.resetAt,
        limit: rateLimit.limit,
        remaining: 0
      };
    }
  }

  // 3. Provider Fallback Loop
  const providerOrder = getProviderOrder(options.providerOrder);
  const normalizedMessages = normalizeMessages(messages);
  const allAttempts: FallbackAttempt[] = [];

  for (let i = 0; i < providerOrder.length; i++) {
    const provider = providerOrder[i];
    const modelName = modelOverrides[provider];
    const apiKeyOverride = apiKeyOverrides[provider];

    const result = await executeProviderWithRetry(provider, normalizedMessages, {
      temperature,
      maxTokens,
      timeoutMs,
      modelName,
      apiKeyOverride
    });

    allAttempts.push(...result.attempts);

    if (result.success && result.content !== null) {
      const totalLatencyMs = Date.now() - startTime;
      const fallbackOccurred = i > 0;

      // Log request details to AiRequestLog
      await AiRequestLog.create({
        userId,
        requestType,
        providerServed: provider,
        fallbackOccurred,
        fallbackChain: allAttempts,
        latencyMs: totalLatencyMs,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        status: fallbackOccurred ? "fallback_success" : "success"
      });

      // Track free-tier usage ceiling
      await checkFreeTierCeilings(provider);

      logger.info(
        {
          userId,
          requestType,
          providerServed: provider,
          fallbackOccurred,
          latencyMs: totalLatencyMs,
          tokensIn: result.tokensIn,
          tokensOut: result.tokensOut
        },
        `AI call served successfully by ${provider}`
      );

      return {
        success: true,
        content: result.content,
        providerServed: provider,
        fallbackOccurred,
        latencyMs: totalLatencyMs,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        attempts: allAttempts
      };
    }
  }

  // 4. On Total Failure (all providers in chain exhausted)
  const totalLatencyMs = Date.now() - startTime;
  await AiRequestLog.create({
    userId,
    requestType,
    providerServed: null,
    fallbackOccurred: true,
    fallbackChain: allAttempts,
    latencyMs: totalLatencyMs,
    tokensIn: 0,
    tokensOut: 0,
    status: "total_failure",
    failureReason: "All AI providers in fallback chain exhausted or failed"
  });

  let queuedForRetry = false;
  if (isAsyncContext) {
    try {
      const enqueueRes = await enqueueJob("ai_retry_job", {
        userId,
        requestType,
        messages: normalizedMessages.map((m) => ({
          role: m._getType() === "system" ? "system" : m._getType() === "ai" ? "assistant" : "user",
          content: m.content
        })),
        options: {
          ...options,
          isAsyncContext: false // Avoid infinite queue loops
        }
      });
      queuedForRetry = enqueueRes.queued;
      logger.info(
        { userId, requestType, jobId: enqueueRes.jobId },
        "Async AI call enqueued for retry"
      );
    } catch (enqueueErr) {
      logger.error({ enqueueErr, userId }, "Failed to enqueue async AI retry job");
    }
  }

  return {
    success: false,
    content: null,
    error: "AI service is currently unavailable. Please try again shortly.",
    isRateLimited: false,
    queuedForRetry,
    attempts: allAttempts
  };
}
