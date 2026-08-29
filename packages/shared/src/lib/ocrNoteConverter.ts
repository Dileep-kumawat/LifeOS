import type { OcrExtractionResult } from "../schemas/ocr.js";
import type { ProseMirrorDoc } from "../schemas/notes.js";

export interface OcrNoteLine {
  text: string;
  confidence?: number;
  isLowConfidence: boolean;
}

export interface OcrNoteDraft {
  title: string;
  bodyText: string;
  proseMirrorDoc: ProseMirrorDoc;
  lines: OcrNoteLine[];
  overallConfidence?: number;
  source: "on_device" | "server_fallback";
}

export interface ConvertOcrOptions {
  /**
   * Date to use when generating fallback title "Scanned note — YYYY-MM-DD".
   * Defaults to new Date().
   */
  fallbackDate?: Date;
  /**
   * Confidence threshold below which a line or block is flagged as low confidence.
   * Defaults to 0.7 (70%).
   */
  lowConfidenceThreshold?: number;
  /**
   * Maximum character length for auto-generated titles.
   * Defaults to 80.
   */
  maxTitleLength?: number;
}

function formatDateIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Derives a clean, sensible default title from extracted OCR text.
 * Uses the first meaningful line (truncated), or falls back to "Scanned note — YYYY-MM-DD".
 */
export function deriveOcrTitle(
  extractedText: string,
  options: ConvertOcrOptions = {}
): string {
  const {
    fallbackDate = new Date(),
    maxTitleLength = 80
  } = options;

  const rawLines = extractedText.split("\n");

  for (const rawLine of rawLines) {
    let clean = rawLine.trim();

    // Strip common leading markers (markdown headers, bullets, numbering)
    clean = clean.replace(/^[#*•-]+\s*/, "");
    clean = clean.replace(/^\d+[\.\)]\s*/, "");
    clean = clean.trim();

    // Check if line contains meaningful alphanumeric content (at least 2 letters/numbers)
    const alphanumericCount = (clean.match(/[\p{L}\p{N}]/gu) || []).length;
    if (alphanumericCount >= 2) {
      if (clean.length > maxTitleLength) {
        // Truncate at nearest word boundary if possible
        const truncated = clean.substring(0, maxTitleLength);
        const lastSpace = truncated.lastIndexOf(" ");
        if (lastSpace > maxTitleLength * 0.6) {
          return truncated.substring(0, lastSpace).trim() + "…";
        }
        return truncated.trim() + "…";
      }
      return clean;
    }
  }

  return `Scanned note — ${formatDateIso(fallbackDate)}`;
}

/**
 * Converts plain text into a minimal, valid TipTap/ProseMirror JSON document.
 * Each paragraph/line becomes a paragraph node with text content.
 */
export function convertTextToProseMirrorDocument(text: string): ProseMirrorDoc {
  const lines = text.split("\n");
  const contentNodes: Array<Record<string, any>> = [];

  for (const line of lines) {
    if (!line.trim()) {
      contentNodes.push({ type: "paragraph" });
    } else {
      contentNodes.push({
        type: "paragraph",
        content: [{ type: "text", text: line }]
      });
    }
  }

  // Ensure at least one paragraph node exists even if text was empty
  if (contentNodes.length === 0) {
    contentNodes.push({ type: "paragraph" });
  }

  return {
    type: "doc",
    content: contentNodes
  };
}

/**
 * Unified conversion function: takes an OcrExtractionResult and produces
 * an editable, pre-filled Note draft with ProseMirror JSON and confidence signals.
 */
export function convertOcrToNoteDraft(
  result: OcrExtractionResult,
  options: ConvertOcrOptions = {}
): OcrNoteDraft {
  const { lowConfidenceThreshold = 0.7 } = options;
  const rawText = (result.extractedText || "").trim();

  const title = deriveOcrTitle(rawText, options);
  const proseMirrorDoc = convertTextToProseMirrorDocument(rawText);

  // Extract per-line confidence signals
  const lines: OcrNoteLine[] = [];

  if (result.blocks && result.blocks.length > 0) {
    for (const block of result.blocks) {
      if (block.lines && block.lines.length > 0) {
        for (const line of block.lines) {
          const text = (line.text || "").trim();
          if (text) {
            const conf = typeof line.confidence === "number" ? line.confidence : block.confidence ?? result.confidence;
            lines.push({
              text,
              confidence: conf,
              isLowConfidence: typeof conf === "number" ? conf < lowConfidenceThreshold : false
            });
          }
        }
      } else {
        const text = (block.text || "").trim();
        if (text) {
          const conf = block.confidence ?? result.confidence;
          lines.push({
            text,
            confidence: conf,
            isLowConfidence: typeof conf === "number" ? conf < lowConfidenceThreshold : false
          });
        }
      }
    }
  }

  // If no structured blocks were returned, split raw extracted text by lines
  if (lines.length === 0 && rawText.length > 0) {
    const rawLines = rawText.split("\n");
    const overallConf = result.confidence;
    const isLow = typeof overallConf === "number" ? overallConf < lowConfidenceThreshold : false;

    for (const line of rawLines) {
      if (line.trim()) {
        lines.push({
          text: line.trim(),
          confidence: overallConf,
          isLowConfidence: isLow
        });
      }
    }
  }

  return {
    title,
    bodyText: rawText,
    proseMirrorDoc,
    lines,
    overallConfidence: result.confidence,
    source: result.source || "on_device"
  };
}
