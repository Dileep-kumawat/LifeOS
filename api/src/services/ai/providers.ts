import { ChatMistralAI } from "@langchain/mistralai";
import { ChatGroq } from "@langchain/groq";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { BaseMessage, HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { env } from "../../config/env.js";
import { logger } from "../../logger.js";
import { AiRequestLog, type FallbackAttempt } from "../../models/AiRequestLog.js";

export type ProviderName = "mistral" | "groq" | "gemini";

export interface MessageInput {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ProviderCallOptions {
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  modelName?: string;
  apiKeyOverride?: string;
}

export interface ProviderExecutionResult {
  success: boolean;
  content: string | null;
  provider: ProviderName;
  durationMs: number;
  tokensIn: number;
  tokensOut: number;
  attempts: FallbackAttempt[];
  lastErrorType?: "timeout" | "rate_limit" | "auth_error" | "api_error" | "unknown";
  lastErrorMessage?: string;
}

export const FREE_TIER_LIMITS_RPM: Record<ProviderName, number> = {
  mistral: 30, // ~30 requests per minute ceiling
  groq: 30,    // ~30 requests per minute ceiling
  gemini: 15   // ~15 requests per minute ceiling
};

/**
 * Converts array of MessageInput or BaseMessage into BaseMessage array for LangChain.
 */
export function normalizeMessages(messages: (MessageInput | BaseMessage)[]): BaseMessage[] {
  return messages.map((m) => {
    if ("role" in m && typeof m.role === "string") {
      if (m.role === "system") return new SystemMessage(m.content);
      if (m.role === "assistant") return new AIMessage(m.content);
      return new HumanMessage(m.content);
    }
    return m as BaseMessage;
  });
}

/**
 * Instantiates the appropriate LangChain Chat model for the given provider.
 */
export function createProviderModel(
  provider: ProviderName,
  opts: ProviderCallOptions = {}
) {
  const temperature = opts.temperature ?? 0.7;
  const maxTokens = opts.maxTokens;

  switch (provider) {
    case "mistral": {
      const apiKey = opts.apiKeyOverride ?? env.MISTRAL_API_KEY ?? process.env.MISTRAL_API_KEY;
      return new ChatMistralAI({
        apiKey: apiKey ?? "placeholder_mistral_key",
        model: opts.modelName ?? "mistral-small-latest",
        temperature,
        maxTokens
      });
    }
    case "groq": {
      const apiKey = opts.apiKeyOverride ?? env.GROQ_API_KEY ?? process.env.GROQ_API_KEY;
      return new ChatGroq({
        apiKey: apiKey ?? "placeholder_groq_key",
        model: opts.modelName ?? "llama-3.3-70b-versatile",
        temperature,
        maxTokens
      });
    }
    case "gemini": {
      const apiKey = opts.apiKeyOverride ?? env.GEMINI_API_KEY ?? env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
      return new ChatGoogleGenerativeAI({
        apiKey: apiKey ?? "placeholder_gemini_key",
        model: opts.modelName ?? "gemini-1.5-flash",
        temperature,
        maxOutputTokens: maxTokens
      });
    }
    default:
      throw new Error(`Unsupported AI provider: ${provider}`);
  }
}

/**
 * Classifies an error into structured error types for diagnostics.
 */
export function classifyError(err: unknown): {
  errorType: "timeout" | "rate_limit" | "auth_error" | "api_error" | "unknown";
  message: string;
} {
  if (!err) return { errorType: "unknown", message: "Unknown error" };

  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();

  if (lower.includes("timeout") || lower.includes("timed out") || lower.includes("abort")) {
    return { errorType: "timeout", message };
  }
  if (lower.includes("429") || lower.includes("rate limit") || lower.includes("quota")) {
    return { errorType: "rate_limit", message };
  }
  if (lower.includes("401") || lower.includes("403") || lower.includes("unauthorized") || lower.includes("invalid api key")) {
    return { errorType: "auth_error", message };
  }
  if (lower.includes("500") || lower.includes("502") || lower.includes("503") || lower.includes("api error")) {
    return { errorType: "api_error", message };
  }

  return { errorType: "unknown", message };
}

/**
 * Executes a single provider with an 8-10s timeout and exactly 1 retry (max 2 attempts total per provider).
 */
export async function executeProviderWithRetry(
  provider: ProviderName,
  messages: BaseMessage[],
  opts: ProviderCallOptions = {}
): Promise<ProviderExecutionResult> {
  const timeoutMs = opts.timeoutMs ?? 9000;
  const attempts: FallbackAttempt[] = [];
  const maxAttempts = 2; // Initial attempt + exactly 1 retry (FR-2.10)

  let lastErrorType: "timeout" | "rate_limit" | "auth_error" | "api_error" | "unknown" = "unknown";
  let lastErrorMessage = "";

  for (let attemptNum = 1; attemptNum <= maxAttempts; attemptNum++) {
    const startTime = Date.now();
    try {
      const model = createProviderModel(provider, opts);

      // Timeout controller per attempt
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort("Request timeout"), timeoutMs);

      const response = await model.invoke(messages, { signal: controller.signal });
      clearTimeout(timeoutId);

      const durationMs = Date.now() - startTime;

      // Extract text content
      const content = typeof response.content === "string" 
        ? response.content 
        : Array.isArray(response.content)
          ? response.content.map(c => (typeof c === "string" ? c : JSON.stringify(c))).join("")
          : String(response.content ?? "");

      // Extract tokens if available in response.usage_metadata
      const usage = (response as any).usage_metadata;
      const tokensIn = usage?.input_tokens ?? usage?.prompt_tokens ?? 0;
      const tokensOut = usage?.output_tokens ?? usage?.completion_tokens ?? 0;

      attempts.push({
        provider,
        success: true,
        durationMs
      });

      return {
        success: true,
        content,
        provider,
        durationMs,
        tokensIn,
        tokensOut,
        attempts
      };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const { errorType, message } = classifyError(err);
      lastErrorType = errorType;
      lastErrorMessage = message;

      attempts.push({
        provider,
        success: false,
        durationMs,
        errorType,
        errorMessage: message
      });

      logger.warn(
        { provider, attemptNum, maxAttempts, durationMs, errorType, message },
        `AI provider attempt failed (${provider})`
      );
    }
  }

  return {
    success: false,
    content: null,
    provider,
    durationMs: attempts.reduce((acc, curr) => acc + curr.durationMs, 0),
    tokensIn: 0,
    tokensOut: 0,
    attempts,
    lastErrorType,
    lastErrorMessage
  };
}

/**
 * Checks provider request count in past 60s and logs a warning if approaching free-tier ceiling.
 */
export async function checkFreeTierCeilings(provider: ProviderName): Promise<void> {
  try {
    const limitRpm = FREE_TIER_LIMITS_RPM[provider];
    if (!limitRpm) return;

    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const countPastMinute = await AiRequestLog.countDocuments({
      providerServed: provider,
      timestamp: { $gte: oneMinuteAgo }
    });

    const threshold = Math.floor(limitRpm * 0.8); // 80% ceiling warning
    if (countPastMinute >= threshold) {
      logger.warn(
        { provider, countPastMinute, ceilingRpm: limitRpm },
        `⚠️ AI Provider (${provider}) is approaching free-tier rate ceiling (${countPastMinute}/${limitRpm} req/min)`
      );
    }
  } catch (err) {
    // Non-blocking log check failure
    logger.debug({ err, provider }, "Free tier ceiling check skipped");
  }
}
