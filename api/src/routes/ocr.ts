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
 *     description: |
 *       **Shared OCR Extraction Pipeline (FR-5.3, FR-6.2, UC-3)**
 *       
 *       Server-side OCR fallback and unified text extraction engine powered by Tesseract and BullMQ.
 *       Accepts image files via `multipart/form-data` or JSON base64 payloads.
 *       
 *       ### Specifications & Limitations:
 *       - **Allowed Image Formats:** `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/bmp`, `image/tiff`
 *       - **Payload Size Limit:** Max 10MB per image upload (enforced by Multer and request body validators)
 *       - **Rate Limiting:** Gated per subscription tier (Free: 20 calls/day, Pro: 200 calls/day, resets at UTC midnight)
 *       - **Execution Mode:** Synchronous short-wait (polls up to 8s before falling back) or immediate asynchronous queueing (`async=true`)
 *       
 *       ### Architectural Distinction: Raw Extraction vs. Structured Consumers
 *       1. **Raw Extraction Shape (`OcrExtractionResult`):**
 *          The endpoint always returns raw concatenated `extractedText`, overall `confidence` (0.0-1.0), `source` (`"server_fallback"`), and structured `blocks` with positional `boundingBox` coordinates (`x`, `y`, `width`, `height`) and line-level confidence scores.
 *       2. **Notes Consumer (`POST /notes` via `convertOcrToProseMirror`):**
 *          Consumes the raw text and line items to produce an ephemeral `OcrNoteDraft` containing a valid ProseMirror document, heuristic title, and per-line low-confidence warning flags (<0.7) for inline user editing before saving.
 *       3. **Finance Consumer (`POST /finance/transactions` via `parseReceiptOcr`):**
 *          Applies heuristic parsing to extract structured receipt fields (`merchant`, `amount`, `date`, `category`, and line items) wrapped in `ReceiptField<T>` with `confidence` and `isLowConfidence` flags before presenting the user with an editable confirmation form.
 *       4. **Future Consumers:**
 *          Any new domain module can consume `OcrExtractionResult` directly from this endpoint or use `@lifeos/shared` utilities to map spatial blocks into domain-specific data structures.
 *       
 *       ### Cross-References:
 *       - See `POST /notes` for creating notes from OCR text drafts.
 *       - See `POST /finance/transactions` for persisting confirmed receipt expenses with automatic budget recalculations.
 *       - See `GET /ocr/extract/{jobId}` for polling asynchronous extraction jobs.
 *     tags:
 *       - OCR
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: async
 *         schema:
 *           type: boolean
 *         description: If true, immediately enqueues the job and returns HTTP 202 with `jobId` and `pollUrl`.
 *     requestBody:
 *       description: Upload an image file as multipart/form-data (`image` or `file` field) or base64 JSON payload.
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Binary image file (JPEG, PNG, WebP, GIF, BMP, TIFF, max 10MB).
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Alternative field name alias for image upload.
 *               async:
 *                 type: boolean
 *                 description: Set to true to request asynchronous background processing.
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               imageBase64:
 *                 type: string
 *                 description: Base64-encoded image data (or data URL scheme `data:image/png;base64,...`).
 *                 example: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
 *               mimeType:
 *                 type: string
 *                 enum: [image/jpeg, image/jpg, image/png, image/webp, image/gif, image/bmp, image/tiff]
 *                 description: MIME type of the base64 image data.
 *                 example: "image/png"
 *               async:
 *                 type: boolean
 *                 description: Set to true for asynchronous processing.
 *     responses:
 *       200:
 *         description: OCR text extraction succeeded synchronously.
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
 *                   description: Complete concatenated text extracted from the image.
 *                 confidence:
 *                   type: number
 *                   format: float
 *                   minimum: 0
 *                   maximum: 1
 *                   description: Overall extraction confidence score normalized between 0.0 and 1.0.
 *                 source:
 *                   type: string
 *                   enum: [on_device, server_fallback]
 *                   description: Identifier of the engine that performed the extraction.
 *                 blocks:
 *                   type: array
 *                   description: Parsed text blocks with bounding box geometry and line confidence.
 *                   items:
 *                     type: object
 *                     properties:
 *                       text: { type: string }
 *                       confidence: { type: number, minimum: 0, maximum: 1 }
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
 *                             confidence: { type: number, minimum: 0, maximum: 1 }
 *                             boundingBox:
 *                               type: object
 *                               properties:
 *                                 x: { type: number }
 *                                 y: { type: number }
 *                                 width: { type: number }
 *                                 height: { type: number }
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     processingTimeMs: { type: number, description: "Total OCR processing duration in milliseconds" }
 *                     engine: { type: string, example: "tesseract" }
 *                     fileSize: { type: number, description: "Size of processed image in bytes" }
 *                     mimeType: { type: string, example: "image/jpeg" }
 *             examples:
 *               note_scan:
 *                 summary: Worked Example 1 — Note Scan (Whiteboard / Handwritten Note)
 *                 value:
 *                   extractedText: "Architecture Meeting Notes\n- Deploy unified OCR pipeline across Web and Mobile\n- Ensure confidence scores are preserved in preview\n- Target release date: 2026-09-01"
 *                   confidence: 0.94
 *                   source: "server_fallback"
 *                   blocks:
 *                     - text: "Architecture Meeting Notes"
 *                       confidence: 0.98
 *                       boundingBox: { x: 42, y: 30, width: 480, height: 40 }
 *                       lines:
 *                         - text: "Architecture Meeting Notes"
 *                           confidence: 0.98
 *                           boundingBox: { x: 42, y: 30, width: 480, height: 40 }
 *                     - text: "- Deploy unified OCR pipeline across Web and Mobile\n- Ensure confidence scores are preserved in preview\n- Target release date: 2026-09-01"
 *                       confidence: 0.92
 *                       boundingBox: { x: 42, y: 85, width: 520, height: 110 }
 *                       lines:
 *                         - text: "- Deploy unified OCR pipeline across Web and Mobile"
 *                           confidence: 0.95
 *                         - text: "- Ensure confidence scores are preserved in preview"
 *                           confidence: 0.93
 *                         - text: "- Target release date: 2026-09-01"
 *                           confidence: 0.88
 *                   metadata:
 *                     processingTimeMs: 412
 *                     engine: "tesseract"
 *                     fileSize: 245120
 *                     mimeType: "image/jpeg"
 *               receipt_scan:
 *                 summary: Worked Example 2 — Receipt Scan (Retail Store Receipt for Finance)
 *                 value:
 *                   extractedText: "STARBUCKS STORE #1042\n123 MARKET STREET\nDATE: 2026-08-27\n1 CAFFE LATTE $4.75\n1 BLUEBERRY MUFFIN $3.85\nSUBTOTAL $8.60\nTAX $0.75\nTOTAL $9.35\nTHANK YOU"
 *                   confidence: 0.95
 *                   source: "server_fallback"
 *                   blocks:
 *                     - text: "STARBUCKS STORE #1042\n123 MARKET STREET\nDATE: 2026-08-27"
 *                       confidence: 0.96
 *                       boundingBox: { x: 20, y: 15, width: 320, height: 65 }
 *                       lines:
 *                         - text: "STARBUCKS STORE #1042"
 *                           confidence: 0.97
 *                         - text: "123 MARKET STREET"
 *                           confidence: 0.96
 *                         - text: "DATE: 2026-08-27"
 *                           confidence: 0.95
 *                     - text: "1 CAFFE LATTE $4.75\n1 BLUEBERRY MUFFIN $3.85\nSUBTOTAL $8.60\nTAX $0.75\nTOTAL $9.35"
 *                       confidence: 0.94
 *                       boundingBox: { x: 20, y: 90, width: 320, height: 140 }
 *                       lines:
 *                         - text: "1 CAFFE LATTE $4.75"
 *                           confidence: 0.96
 *                         - text: "1 BLUEBERRY MUFFIN $3.85"
 *                           confidence: 0.94
 *                         - text: "SUBTOTAL $8.60"
 *                           confidence: 0.96
 *                         - text: "TAX $0.75"
 *                           confidence: 0.92
 *                         - text: "TOTAL $9.35"
 *                           confidence: 0.98
 *                   metadata:
 *                     processingTimeMs: 530
 *                     engine: "tesseract"
 *                     fileSize: 182300
 *                     mimeType: "image/png"
 *       202:
 *         description: OCR job enqueued for background asynchronous execution.
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
 *         description: Bad Request — missing image, unsupported MIME format, or payload exceeds 10MB limit.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - error
 *                 - message
 *               properties:
 *                 error:
 *                   type: string
 *                   enum: [InvalidFileType, FileTooLarge, MissingImage, UploadError]
 *                 message:
 *                   type: string
 *             examples:
 *               oversized_file:
 *                 summary: File size exceeds 10MB limit
 *                 value:
 *                   error: "FileTooLarge"
 *                   message: "Image size exceeds maximum allowed limit of 10MB"
 *               invalid_mime:
 *                 summary: Unsupported file MIME type
 *                 value:
 *                   error: "InvalidFileType"
 *                   message: "Only image files (JPEG, PNG, WebP, GIF, BMP, TIFF) are supported for OCR extraction"
 *               missing_image:
 *                 summary: No image provided in request
 *                 value:
 *                   error: "MissingImage"
 *                   message: "An image file (multipart upload) or imageBase64 string is required"
 *       401:
 *         description: Unauthorized — missing or invalid JWT bearer token.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: string, example: "Unauthorized" }
 *                 message: { type: string, example: "Authentication required" }
 *       429:
 *         description: Rate limit exceeded for user's subscription tier.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - error
 *                 - message
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "RateLimitExceeded"
 *                 message:
 *                   type: string
 *                   example: "OCR extraction rate limit exceeded for your subscription tier (free). Quota resets at 2026-08-30T00:00:00.000Z."
 *                 limit:
 *                   type: number
 *                   example: 20
 *                 resetAt:
 *                   type: string
 *                   format: date-time
 *                   example: "2026-08-30T00:00:00.000Z"
 *       500:
 *         description: OCR processing or queue failure.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: string, example: "OcrFailed" }
 *                 message: { type: string, example: "Tesseract extraction encountered an unexpected error" }
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
