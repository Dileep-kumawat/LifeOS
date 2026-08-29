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
/**
 * Derives a clean, sensible default title from extracted OCR text.
 * Uses the first meaningful line (truncated), or falls back to "Scanned note — YYYY-MM-DD".
 */
export declare function deriveOcrTitle(extractedText: string, options?: ConvertOcrOptions): string;
/**
 * Converts plain text into a minimal, valid TipTap/ProseMirror JSON document.
 * Each paragraph/line becomes a paragraph node with text content.
 */
export declare function convertTextToProseMirrorDocument(text: string): ProseMirrorDoc;
/**
 * Unified conversion function: takes an OcrExtractionResult and produces
 * an editable, pre-filled Note draft with ProseMirror JSON and confidence signals.
 */
export declare function convertOcrToNoteDraft(result: OcrExtractionResult, options?: ConvertOcrOptions): OcrNoteDraft;
