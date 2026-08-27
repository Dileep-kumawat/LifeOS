import { redis } from "../../db/redis.js";
import { logger } from "../../logger.js";
import { extractTextFromImage, type OcrEngineOptions } from "./ocrEngine.js";
import type { OcrExtractionResult, OcrJobStatus } from "@lifeos/shared";

export interface OcrJobData {
  jobId?: string;
  userId: string;
  imageBase64: string;
  mimeType: string;
  options?: OcrEngineOptions;
  createdAt?: string;
}

const OCR_JOB_KEY_PREFIX = "ocr:job:";
const DEFAULT_TTL_SECONDS = 3600; // 1 hour

/**
 * Persists OCR job execution status and results in Redis with TTL.
 */
export async function setOcrJobStatus(
  jobId: string,
  statusData: OcrJobStatus,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<void> {
  const key = `${OCR_JOB_KEY_PREFIX}${jobId}`;
  try {
    await redis.set(key, JSON.stringify(statusData), "EX", ttlSeconds);
  } catch (err) {
    logger.warn({ err, jobId }, "Failed to write OCR job status to Redis");
  }
}

/**
 * Retrieves OCR job execution status and result from Redis.
 */
export async function getOcrJobStatus(jobId: string): Promise<OcrJobStatus | null> {
  const key = `${OCR_JOB_KEY_PREFIX}${jobId}`;
  try {
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as OcrJobStatus;
  } catch (err) {
    logger.warn({ err, jobId }, "Failed to read OCR job status from Redis");
    return null;
  }
}

/**
 * Worker handler for processing an OCR job.
 */
export async function handleOcrJobWorker(jobId: string, data: OcrJobData): Promise<OcrExtractionResult> {
  const { imageBase64, mimeType, options, createdAt } = data;

  await setOcrJobStatus(jobId, {
    jobId,
    status: "processing",
    createdAt: createdAt || new Date().toISOString()
  });

  try {
    const buffer = Buffer.from(imageBase64, "base64");
    const result = await extractTextFromImage(buffer, mimeType, options);

    await setOcrJobStatus(jobId, {
      jobId,
      status: "completed",
      result,
      createdAt: createdAt || new Date().toISOString(),
      completedAt: new Date().toISOString()
    });

    logger.info({ jobId, textLength: result.extractedText.length }, "OCR job worker completed successfully");
    return result;
  } catch (err: any) {
    const errorMsg = err?.message || "OCR extraction failed";
    logger.error({ err, jobId }, "OCR job worker failed");

    await setOcrJobStatus(jobId, {
      jobId,
      status: "failed",
      error: errorMsg,
      createdAt: createdAt || new Date().toISOString(),
      completedAt: new Date().toISOString()
    });

    throw err;
  }
}
