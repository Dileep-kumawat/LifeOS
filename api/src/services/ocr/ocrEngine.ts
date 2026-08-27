import { createWorker } from "tesseract.js";
import { logger } from "../../logger.js";
import { env } from "../../config/env.js";
import type {
  OcrExtractionResult,
  OcrBlock,
  OcrLine,
  OcrBoundingBox
} from "@lifeos/shared";

/**
 * Server-Side OCR Provider Selection:
 *
 * Tesseract (via tesseract.js) is chosen as the default primary server-side OCR engine.
 *
 * Rationale:
 * 1. Self-contained & Free: Runs directly in Node.js (via WebAssembly/C++ binaries) without
 *    mandating a paid external cloud API key or billing account. This ensures local development,
 *    CI workflows, and self-hosted instances function seamlessly out-of-the-box.
 * 2. Rich Spatial & Confidence Data: Provides line-, block-, and word-level bounding boxes and
 *    confidence scores (0-100, which we normalize to 0.0-1.0), satisfying downstream UI requirements.
 * 3. Optional Google Cloud Vision Support: When `GOOGLE_VISION_API_KEY` or `GOOGLE_API_KEY` is
 *    present in the environment, developers can opt-in to Google Cloud Vision API for higher
 *    accuracy without modifying call sites.
 */

export interface OcrEngineOptions {
  engine?: "tesseract" | "google_vision";
  language?: string;
}

/**
 * Extract text and spatial/confidence signals using Tesseract.js.
 */
async function extractWithTesseract(
  imageBuffer: Buffer,
  mimeType: string,
  language: string = "eng"
): Promise<OcrExtractionResult> {
  const startTime = Date.now();
  let worker: any = null;

  try {
    worker = await createWorker(language);
    const ret = await worker.recognize(imageBuffer);
    const { data } = ret;

    const extractedText = (data.text || "").trim();
    // Tesseract confidence is 0-100; normalize to 0.0-1.0
    const rawConfidence = typeof data.confidence === "number" ? data.confidence : 0;
    const normalizedConfidence = Math.max(0, Math.min(1, Math.round(rawConfidence) / 100));

    const blocks: OcrBlock[] = (data.blocks || []).map((b: any) => {
      const blockBbox: OcrBoundingBox | undefined = b.bbox
        ? {
            x: b.bbox.x0 ?? 0,
            y: b.bbox.y0 ?? 0,
            width: Math.max(0, (b.bbox.x1 ?? 0) - (b.bbox.x0 ?? 0)),
            height: Math.max(0, (b.bbox.y1 ?? 0) - (b.bbox.y0 ?? 0))
          }
        : undefined;

      const lines: OcrLine[] = (b.lines || []).map((l: any) => {
        const lineBbox: OcrBoundingBox | undefined = l.bbox
          ? {
              x: l.bbox.x0 ?? 0,
              y: l.bbox.y0 ?? 0,
              width: Math.max(0, (l.bbox.x1 ?? 0) - (l.bbox.x0 ?? 0)),
              height: Math.max(0, (l.bbox.y1 ?? 0) - (l.bbox.y0 ?? 0))
            }
          : undefined;

        const lineConf = typeof l.confidence === "number" ? l.confidence : rawConfidence;

        return {
          text: (l.text || "").trim(),
          confidence: Math.max(0, Math.min(1, Math.round(lineConf) / 100)),
          boundingBox: lineBbox
        };
      });

      const blockConf = typeof b.confidence === "number" ? b.confidence : rawConfidence;

      return {
        text: (b.text || "").trim(),
        confidence: Math.max(0, Math.min(1, Math.round(blockConf) / 100)),
        boundingBox: blockBbox,
        lines
      };
    });

    const processingTimeMs = Date.now() - startTime;

    logger.info(
      {
        engine: "tesseract",
        textLength: extractedText.length,
        confidence: normalizedConfidence,
        processingTimeMs
      },
      "Tesseract OCR extraction completed"
    );

    return {
      extractedText,
      confidence: normalizedConfidence,
      source: "server_fallback",
      blocks,
      metadata: {
        processingTimeMs,
        engine: "tesseract",
        fileSize: imageBuffer.length,
        mimeType
      }
    };
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch (termErr) {
        logger.warn({ termErr }, "Error terminating Tesseract worker");
      }
    }
  }
}

/**
 * Extract text and spatial signals using Google Cloud Vision REST API if configured.
 */
async function extractWithGoogleVision(
  imageBuffer: Buffer,
  mimeType: string,
  apiKey: string
): Promise<OcrExtractionResult> {
  const startTime = Date.now();
  const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;

  const payload = {
    requests: [
      {
        image: {
          content: imageBuffer.toString("base64")
        },
        features: [
          { type: "DOCUMENT_TEXT_DETECTION" },
          { type: "TEXT_DETECTION" }
        ]
      }
    ]
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Vision API responded with status ${response.status}: ${errorText}`);
  }

  const resultData = (await response.json()) as any;
  const annotation = resultData.responses?.[0];

  if (annotation?.error) {
    throw new Error(`Google Vision API error: ${annotation.error.message}`);
  }

  const fullTextAnnotation = annotation?.fullTextAnnotation;
  const extractedText = (fullTextAnnotation?.text || "").trim();

  // Aggregate blocks and compute average confidence
  const blocks: OcrBlock[] = [];
  let totalConfidence = 0;
  let confidenceCount = 0;

  if (fullTextAnnotation?.pages) {
    for (const page of fullTextAnnotation.pages) {
      for (const b of page.blocks || []) {
        const vertices = b.boundingBox?.vertices || [];
        const x = vertices[0]?.x ?? 0;
        const y = vertices[0]?.y ?? 0;
        const width = Math.max(0, (vertices[1]?.x ?? x) - x);
        const height = Math.max(0, (vertices[2]?.y ?? y) - y);

        const blockConf = typeof b.confidence === "number" ? b.confidence : 0.9;
        totalConfidence += blockConf;
        confidenceCount++;

        const lines: OcrLine[] = [];
        for (const paragraph of b.paragraphs || []) {
          const paraText = (paragraph.words || [])
            .map((w: any) => (w.symbols || []).map((s: any) => s.text).join(""))
            .join(" ");
          
          const paraConf = typeof paragraph.confidence === "number" ? paragraph.confidence : blockConf;

          lines.push({
            text: paraText.trim(),
            confidence: Math.max(0, Math.min(1, paraConf))
          });
        }

        blocks.push({
          text: lines.map((l) => l.text).join("\n"),
          confidence: Math.max(0, Math.min(1, blockConf)),
          boundingBox: { x, y, width, height },
          lines
        });
      }
    }
  }

  const avgConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0.9;
  const processingTimeMs = Date.now() - startTime;

  logger.info(
    {
      engine: "google_vision",
      textLength: extractedText.length,
      confidence: avgConfidence,
      processingTimeMs
    },
    "Google Vision OCR extraction completed"
  );

  return {
    extractedText,
    confidence: Math.max(0, Math.min(1, Math.round(avgConfidence * 100) / 100)),
    source: "server_fallback",
    blocks,
    metadata: {
      processingTimeMs,
      engine: "google_vision",
      fileSize: imageBuffer.length,
      mimeType
    }
  };
}

/**
 * Universal server-side OCR extraction entry point.
 */
export async function extractTextFromImage(
  imageBuffer: Buffer,
  mimeType: string,
  options: OcrEngineOptions = {}
): Promise<OcrExtractionResult> {
  const visionApiKey = env.GOOGLE_API_KEY || (process.env.GOOGLE_VISION_API_KEY as string | undefined);

  if (options.engine === "google_vision" && visionApiKey) {
    try {
      return await extractWithGoogleVision(imageBuffer, mimeType, visionApiKey);
    } catch (err) {
      logger.warn({ err }, "Google Vision OCR failed, falling back to Tesseract");
    }
  }

  return await extractWithTesseract(imageBuffer, mimeType, options.language ?? "eng");
}
