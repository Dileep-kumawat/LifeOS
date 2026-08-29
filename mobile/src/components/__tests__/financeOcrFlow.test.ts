import { describe, it, expect } from "vitest";
import {
  parseReceiptOcr,
  createTransactionSchema,
  DEFAULT_EXPENSE_CATEGORIES,
  type OcrExtractionResult
} from "@lifeos/shared";

describe("Mobile Finance OCR Flow: Receipt Capture → Structured Field Extraction → Confirmation (FR-6.2, UC-3)", () => {
  describe("Receipt OCR Parsing & Heuristics", () => {
    it("extracts merchant, amount, date, and category suggestions from raw receipt text", () => {
      const ocrResult: OcrExtractionResult = {
        extractedText: `
WHOLE FOODS MARKET
399 4th St, San Francisco, CA
Date: 2026-08-28 17:42
--------------------------------
ORGANIC APPLES           4.99
ALMOND MILK              3.49
OLIVE OIL               14.99
--------------------------------
SUBTOTAL                23.47
TAX                      2.11
TOTAL                  $25.58
VISA CARD ************1234
        `,
        confidence: 0.94,
        source: "on_device"
      };

      const parsed = parseReceiptOcr(ocrResult, { categories: DEFAULT_EXPENSE_CATEGORIES });

      expect(parsed.merchant.value).toBe("WHOLE FOODS MARKET");
      expect(parsed.merchant.isLowConfidence).toBe(false);

      expect(parsed.amount.value).toBe(25.58);
      expect(parsed.amount.isLowConfidence).toBe(false);

      expect(parsed.date.value).toBe("2026-08-28");
      expect(parsed.date.isLowConfidence).toBe(false);

      expect(parsed.category?.value).toBe("Food");
      expect(parsed.source).toBe("on_device");
      expect(parsed.overallConfidence).toBeGreaterThanOrEqual(0.85);

      expect(parsed.lineItems?.length).toBe(3);
      expect(parsed.lineItems?.[0].description).toBe("ORGANIC APPLES");
      expect(parsed.lineItems?.[0].amount).toBe(4.99);
    });

    it("flags low-confidence and missing fields when receipt is blurry or incomplete", () => {
      const blurryOcr: OcrExtractionResult = {
        extractedText: `
...faded header...
Unreadable item 1
Total ??.??
        `,
        confidence: 0.38,
        source: "server_fallback"
      };

      const parsed = parseReceiptOcr(blurryOcr, { lowConfidenceThreshold: 0.7 });

      expect(parsed.amount.value).toBeNull();
      expect(parsed.amount.isLowConfidence).toBe(true);

      expect(parsed.date.value).toBeNull();
      expect(parsed.date.isLowConfidence).toBe(true);

      expect(parsed.overallConfidence).toBeLessThan(0.7);
    });
  });

  describe("Review & Confirmation Flow", () => {
    it("allows the user to edit extracted fields and persists the final transaction safely", () => {
      const ocrResult: OcrExtractionResult = {
        extractedText: `
UBER TRIP RECEIPT
Trip Date: 2026-08-27
Total: $18.40
        `,
        confidence: 0.89,
        source: "server_fallback"
      };

      const parsed = parseReceiptOcr(ocrResult, { categories: DEFAULT_EXPENSE_CATEGORIES });

      expect(parsed.merchant.value).toBe("UBER TRIP RECEIPT");
      expect(parsed.amount.value).toBe(18.40);
      expect(parsed.category?.value).toBe("Transport");

      // User reviews in MobileReceiptPreviewCard / TransactionFormModal and customizes note
      const confirmedTransactionPayload = {
        amount: parsed.amount.value!,
        type: "expense" as const,
        category: parsed.category?.value || "Transport",
        date: new Date(`${parsed.date.value}T12:00:00.000Z`),
        note: "Uber ride to office meeting", // User edited note
        receiptAttachment: null
      };

      const validation = createTransactionSchema.safeParse(confirmedTransactionPayload);
      expect(validation.success).toBe(true);

      const validated = validation.data!;
      expect(validated.amount).toBe(18.40);
      expect(validated.type).toBe("expense");
      expect(validated.category).toBe("Transport");
      expect(validated.note).toBe("Uber ride to office meeting");

      // Formulate local SQLite representation with sync_status: pending
      const localTx = {
        id: "tx-local-uuid-1234",
        userId: "user-1",
        amount: validated.amount,
        type: validated.type,
        category: validated.category,
        date: validated.date.toISOString(),
        note: validated.note,
        receiptAttachment: validated.receiptAttachment,
        sync_status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      expect(localTx.amount).toBe(18.40);
      expect(localTx.sync_status).toBe("pending");
    });
  });
});
