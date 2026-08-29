import { z } from "zod";

// ─── Bounding Boxes and Positional Signals ──────────────────────────────────
export const ocrBoundingBoxSchema = z.object({
  x: z.number().describe("X coordinate of top-left corner"),
  y: z.number().describe("Y coordinate of top-left corner"),
  width: z.number().describe("Width of the bounding box"),
  height: z.number().describe("Height of the bounding box")
});

export type OcrBoundingBox = z.infer<typeof ocrBoundingBoxSchema>;

export const ocrLineSchema = z.object({
  text: z.string(),
  confidence: z.number().min(0).max(1).optional().describe("Confidence score normalized between 0.0 and 1.0"),
  boundingBox: ocrBoundingBoxSchema.optional()
});

export type OcrLine = z.infer<typeof ocrLineSchema>;

export const ocrBlockSchema = z.object({
  text: z.string(),
  confidence: z.number().min(0).max(1).optional().describe("Confidence score normalized between 0.0 and 1.0"),
  boundingBox: ocrBoundingBoxSchema.optional(),
  lines: z.array(ocrLineSchema).optional()
});

export type OcrBlock = z.infer<typeof ocrBlockSchema>;

// ─── Unified Extraction Result Shape ─────────────────────────────────────────
// Regardless of which path served the extraction (on-device ML Kit or server fallback),
// downstream consumers (Notes pre-fill in Prompt 2, Finance receipt parsing in Prompt 3)
// receive this exact unified shape.
export const ocrExtractionResultSchema = z.object({
  extractedText: z.string().describe("Complete raw concatenated text extracted from image"),
  confidence: z.number().min(0).max(1).optional().describe("Overall extraction confidence score (0.0 - 1.0)"),
  source: z.enum(["on_device", "server_fallback"]).describe("Originating extraction engine"),
  blocks: z.array(ocrBlockSchema).optional().describe("Parsed text blocks with spatial & confidence data"),
  metadata: z
    .object({
      processingTimeMs: z.number().optional(),
      engine: z.string().optional(),
      fileSize: z.number().optional(),
      mimeType: z.string().optional()
    })
    .optional()
});

export type OcrExtractionResult = z.infer<typeof ocrExtractionResultSchema>;

// ─── Server Job Polling & Status Schemas ─────────────────────────────────────
export const ocrJobStatusSchema = z.object({
  jobId: z.string(),
  status: z.enum(["pending", "processing", "completed", "failed"]),
  error: z.string().optional(),
  result: ocrExtractionResultSchema.optional(),
  createdAt: z.string().optional(),
  completedAt: z.string().optional()
});

export type OcrJobStatus = z.infer<typeof ocrJobStatusSchema>;

export const ocrExtractBodySchema = z.object({
  imageBase64: z.string().optional().describe("Base64-encoded image string"),
  mimeType: z.string().optional().describe("Image MIME type (e.g. image/jpeg, image/png)"),
  async: z.boolean().optional().default(false).describe("If true, returns 202 immediately with jobId without short-polling wait")
});

export type OcrExtractBody = z.infer<typeof ocrExtractBodySchema>;

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/tiff"
] as const;

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

// ─── Structured Receipt Parsing Schemas (Finance FR-6.2, UC-3) ───────────────
export function createReceiptFieldSchema<T extends z.ZodTypeAny>(valueSchema: T) {
  return z.object({
    value: valueSchema,
    confidence: z.number().min(0).max(1).describe("Confidence score between 0.0 and 1.0"),
    isLowConfidence: z.boolean().describe("True if confidence is below review threshold or matched via weak heuristics"),
    rawText: z.string().optional().describe("Underlying matched text fragment or line")
  });
}

export const receiptFieldStringSchema = createReceiptFieldSchema(z.string());
export const receiptFieldNumberSchema = createReceiptFieldSchema(z.number().nullable());
export const receiptFieldDateSchema = createReceiptFieldSchema(z.string().nullable());
export const receiptFieldCategorySchema = createReceiptFieldSchema(z.string().nullable());

export type ReceiptField<T> = {
  value: T;
  confidence: number;
  isLowConfidence: boolean;
  rawText?: string;
};

export const receiptLineItemSchema = z.object({
  description: z.string(),
  amount: z.number().optional(),
  confidence: z.number().min(0).max(1).optional()
});

export type ReceiptLineItem = z.infer<typeof receiptLineItemSchema>;

export const parsedReceiptResultSchema = z.object({
  merchant: receiptFieldStringSchema,
  amount: receiptFieldNumberSchema,
  date: receiptFieldDateSchema,
  category: receiptFieldCategorySchema.optional(),
  lineItems: z.array(receiptLineItemSchema).optional(),
  overallConfidence: z.number().min(0).max(1),
  source: z.enum(["on_device", "server_fallback"]),
  rawText: z.string()
});

export type ParsedReceiptResult = z.infer<typeof parsedReceiptResultSchema>;
