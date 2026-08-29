import type { OcrExtractionResult, ParsedReceiptResult } from "../schemas/ocr.js";
export interface ParseReceiptOptions {
    /**
     * Confidence threshold below which a field is marked isLowConfidence: true.
     * Default: 0.70 (70%).
     */
    lowConfidenceThreshold?: number;
    /**
     * User's existing expense categories to match against.
     */
    categories?: string[];
    /**
     * Reference date for fallback calculations.
     */
    referenceDate?: Date;
}
/**
 * Structured Receipt OCR Parser
 *
 * Takes an OcrExtractionResult from either mobile on-device ML Kit or server-side BullMQ fallback
 * and performs structured regex/heuristic extraction for:
 * - Merchant Name (description/note field in transaction)
 * - Total Amount (amount)
 * - Date (transaction date)
 * - Category Suggestion (stretch goal heuristic)
 * - Per-field confidence scores & low-confidence flags
 */
export declare function parseReceiptOcr(result: OcrExtractionResult, options?: ParseReceiptOptions): ParsedReceiptResult;
