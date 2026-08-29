import express, { type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/authMiddleware.js";
import { enqueueJob } from "../services/queue.js";
import { checkOcrRateLimit } from "../services/ocr/rateLimiter.js";
import { getOcrJobStatus, setOcrJobStatus } from "../services/ocr/ocrJobService.js";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES
} from "@lifeos/shared";

export const ocrRouter = express.Router();
ocrRouter.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES }
});

function uploadMiddleware(req: Request, res: Response, next: NextFunction) {
  upload.fields([{ name: "image", maxCount: 1 }, { name: "file", maxCount: 1 }])(req, res, (err: any) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE" || err.message?.includes("too large")) {
        return res.status(400).json({
          error: "FileTooLarge",
          message: `Image size exceeds maximum allowed limit of ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB`
        });
      }
      return res.status(400).json({
        error: "UploadError",
        message: err.message || "Failed to process uploaded image file"
      });
    }
    next();
  });
}

/**
 * @openapi
 * /ocr/extract:
 *   post:
 *     summary: Extract raw text and spatial confidence signals from an image
 *     description: >
 *       Server-side OCR fallback endpoint. Accepts image files via multipart/form-data
 *       or base64 payload. Validates MIME type and enforces a 10MB size limit.
 *       Routes through the BullMQ job queue with synchronous waiting (up to 8s) or
 *       async status polling.
 *       
 *       Primary consumers:
 *       1. Notes Module (FR-5.3): "Photographed text → editable note pre-fill", converting extractedText into ProseMirror draft notes.
 *       2. Finance Module (FR-6.2, UC-3): "Photographed receipt → merchant/amount/date extraction → pre-filled transaction for confirmation", parsing structured fields with per-field confidence before user confirmation via standard POST /finance/transactions.
 *     tags:
 *       - OCR
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: async
 *         schema:
 *           type: boolean
 *         description: If true, returns 202 immediately with jobId for asynchronous status polling
 *     requestBody:
 *       description: Upload an image file (multipart/form-data) or supply a JSON base64 string
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file (JPEG, PNG, WebP, GIF, BMP, TIFF, max 10MB)
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Alias for image file upload
 *               async:
 *                 type: boolean
 *                 description: If true, returns 202 immediately with jobId
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               imageBase64:
 *                 type: string
 *                 description: Base64-encoded image data
 *               mimeType:
 *                 type: string
 *                 enum: [image/jpeg, image/jpg, image/png, image/webp, image/gif, image/bmp, image/tiff]
 *                 description: MIME type of the base64 image
 *               async:
 *                 type: boolean
 *                 description: If true, returns 202 immediately
 *     responses:
 *       200:
 *         description: OCR text extraction successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - extractedText
 *                 - source
 *               properties:
 *                 extractedText:
 *                   type: string
 *                   example: "COFFEE SHOP\nDate: 2026-08-27\nTotal: $12.50"
 *                 confidence:
 *                   type: number
 *                   format: float
 *                   example: 0.94
 *                 source:
 *                   type: string
 *                   enum: [on_device, server_fallback]
 *                   example: "server_fallback"
 *                 blocks:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       text:
 *                         type: string
 *                       confidence:
 *                         type: number
 *                       boundingBox:
 *                         type: object
 *                         properties:
 *                           x: { type: number }
 *                           y: { type: number }
 *                           width: { type: number }
 *                           height: { type: number }
 *                       lines:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             text: { type: string }
 *                             confidence: { type: number }
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     processingTimeMs: { type: number }
 *                     engine: { type: string, example: "tesseract" }
 *                     fileSize: { type: number }
 *                     mimeType: { type: string }
 *       202:
 *         description: OCR job enqueued for background processing
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - jobId
 *                 - status
 *                 - pollUrl
 *               properties:
 *                 jobId:
 *                   type: string
 *                   example: "ocr-job-12345"
 *                 status:
 *                   type: string
 *                   example: "pending"
 *                 pollUrl:
 *                   type: string
 *                   example: "/api/v1/ocr/extract/ocr-job-12345"
 *       400:
 *         description: Invalid file type, missing image, or file size exceeds 10MB limit
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "InvalidFileType"
 *                 message:
 *                   type: string
 *                   example: "Only image files (JPEG, PNG, WebP, GIF, BMP, TIFF) are supported for OCR extraction"
 *       401:
 *         description: Unauthorized - missing or invalid JWT
 *       429:
 *         description: Rate limit exceeded for subscription tier
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "RateLimitExceeded"
 *                 message:
 *                   type: string
 *       500:
 *         description: OCR processing failure
 */
ocrRouter.post("/ocr/extract", uploadMiddleware, async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const tier = req.user!.subscriptionTier || "free";

  let imageBase64 = "";
  let mimeType = "";

  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
  const uploadedFile = files?.image?.[0] || files?.file?.[0] || (req.file as Express.Multer.File | undefined);

  if (uploadedFile) {
    if (uploadedFile.size > MAX_IMAGE_SIZE_BYTES) {
      return res.status(400).json({
        error: "FileTooLarge",
        message: `Image size exceeds maximum allowed limit of ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB`
      });
    }

    if (!ALLOWED_IMAGE_MIME_TYPES.includes(uploadedFile.mimetype as any)) {
      return res.status(400).json({
        error: "InvalidFileType",
        message: "Only image files (JPEG, PNG, WebP, GIF, BMP, TIFF) are supported for OCR extraction"
      });
    }

    imageBase64 = uploadedFile.buffer.toString("base64");
    mimeType = uploadedFile.mimetype;
  } else if (req.body?.imageBase64) {
    let rawBase64 = req.body.imageBase64 as string;
    let detectedMime = (req.body.mimeType as string) || "image/jpeg";

    // Handle data URL scheme (e.g. data:image/png;base64,...)
    if (rawBase64.startsWith("data:")) {
      const parts = rawBase64.split(",");
      const mimeMatch = parts[0].match(/data:(.*?);base64/);
      if (mimeMatch) {
        detectedMime = mimeMatch[1];
      }
      rawBase64 = parts[1] || "";
    }

    if (!ALLOWED_IMAGE_MIME_TYPES.includes(detectedMime as any)) {
      return res.status(400).json({
        error: "InvalidFileType",
        message: "Only image files (JPEG, PNG, WebP, GIF, BMP, TIFF) are supported for OCR extraction"
      });
    }

    const approxSizeBytes = Math.ceil((rawBase64.length * 3) / 4);
    if (approxSizeBytes > MAX_IMAGE_SIZE_BYTES) {
      return res.status(400).json({
        error: "FileTooLarge",
        message: `Image size exceeds maximum allowed limit of ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB`
      });
    }

    imageBase64 = rawBase64;
    mimeType = detectedMime;
  } else {
    return res.status(400).json({
      error: "MissingImage",
      message: "An image file (multipart upload) or imageBase64 string is required"
    });
  }

  // Rate Limiting
  const rateLimit = await checkOcrRateLimit(userId, tier);
  if (!rateLimit.allowed) {
    return res.status(429).json({
      error: "RateLimitExceeded",
      message: `OCR extraction rate limit exceeded for your subscription tier (${tier}). Quota resets at ${rateLimit.resetAt.toISOString()}.`,
      limit: rateLimit.limit,
      resetAt: rateLimit.resetAt
    });
  }

  const isAsyncRequest =
    req.query.async === "true" ||
    req.body.async === true ||
    req.body.async === "true";

  // Enqueue OCR Job via generic BullMQ queue wrapper
  const enqueueRes = await enqueueJob("ocr", {
    userId,
    imageBase64,
    mimeType,
    createdAt: new Date().toISOString()
  });

  const jobId = enqueueRes.jobId;
  if (!jobId) {
    return res.status(500).json({
      error: "QueueError",
      message: "Failed to allocate job ID for OCR extraction"
    });
  }

  // Mark job as pending in Redis if not already set
  const existingStatus = await getOcrJobStatus(jobId);
  if (!existingStatus) {
    await setOcrJobStatus(jobId, {
      jobId,
      status: "pending",
      createdAt: new Date().toISOString()
    });
  }

  if (isAsyncRequest) {
    return res.status(202).json({
      jobId,
      status: "pending",
      pollUrl: `/api/v1/ocr/extract/${jobId}`
    });
  }

  // Synchronous-ish short-wait with reasonable timeout (up to 8 seconds)
  const maxWaitMs = 8000;
  const pollIntervalMs = 300;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const statusData = await getOcrJobStatus(jobId);
    if (statusData) {
      if (statusData.status === "completed" && statusData.result) {
        return res.status(200).json(statusData.result);
      }
      if (statusData.status === "failed") {
        return res.status(500).json({
          error: "OcrFailed",
          message: statusData.error || "OCR extraction failed"
        });
      }
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  // If timeout expired before completion, return 202 Accepted with polling URL
  return res.status(202).json({
    jobId,
    status: "pending",
    pollUrl: `/api/v1/ocr/extract/${jobId}`
  });
});

/**
 * @openapi
 * /ocr/extract/{jobId}:
 *   get:
 *     summary: Retrieve status and extracted result of an asynchronous OCR job
 *     description: Returns the processing status and extracted text/blocks for an enqueued OCR job.
 *     tags:
 *       - OCR
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique OCR job identifier returned during enqueue
 *     responses:
 *       200:
 *         description: Job status and result retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - jobId
 *                 - status
 *               properties:
 *                 jobId:
 *                   type: string
 *                   example: "ocr-job-12345"
 *                 status:
 *                   type: string
 *                   enum: [pending, processing, completed, failed]
 *                   example: "completed"
 *                 result:
 *                   type: object
 *                   properties:
 *                     extractedText: { type: string }
 *                     confidence: { type: number }
 *                     source: { type: string }
 *                     blocks: { type: array, items: { type: object } }
 *                 error:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                 completedAt:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Job not found or expired
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "JobNotFound"
 *                 message:
 *                   type: string
 *                   example: "OCR extraction job not found or expired"
 */
ocrRouter.get("/ocr/extract/:jobId", async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const statusData = await getOcrJobStatus(jobId);

  if (!statusData) {
    return res.status(404).json({
      error: "JobNotFound",
      message: "OCR extraction job not found or expired"
    });
  }

  return res.status(200).json(statusData);
});
