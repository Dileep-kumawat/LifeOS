import { describe, it, expect } from "vitest";
import { parseReceiptOcr, parsedReceiptResultSchema, createTransactionSchema } from "../../../src/index.js";
describe("Finance OCR Integration: Receipt Parsing & Field Extraction (FR-6.2, UC-3)", () => {
    describe("1. Structured Field Extraction from Printed Receipts", () => {
        it("extracts merchant, amount, date, and category from a coffee shop receipt", () => {
            const receiptOcr = {
                extractedText: `
STARBUCKS COFFEE #1042
123 Market Street, San Francisco, CA
Date: 2026-08-27
Time: 08:45 AM
--------------------------------
1 Caffe Latte           4.75
1 Croissant             4.25
1 Bottled Water         2.50
--------------------------------
Subtotal: $11.50
Tax: $1.00
TOTAL: $12.50
Mastercard ************1234
Thank you for visiting!
        `,
                confidence: 0.94,
                source: "on_device"
            };
            const result = parseReceiptOcr(receiptOcr);
            // Verify schema conformance
            const parseValidation = parsedReceiptResultSchema.safeParse(result);
            expect(parseValidation.success).toBe(true);
            // Merchant
            expect(result.merchant.value).toBe("STARBUCKS COFFEE #1042");
            expect(result.merchant.confidence).toBeGreaterThanOrEqual(0.85);
            expect(result.merchant.isLowConfidence).toBe(false);
            // Amount
            expect(result.amount.value).toBe(12.50);
            expect(result.amount.confidence).toBeGreaterThanOrEqual(0.9);
            expect(result.amount.isLowConfidence).toBe(false);
            // Date
            expect(result.date.value).toBe("2026-08-27");
            expect(result.date.confidence).toBeGreaterThanOrEqual(0.9);
            expect(result.date.isLowConfidence).toBe(false);
            // Category Suggestion
            expect(result.category?.value).toBe("Food");
            expect(result.category?.confidence).toBeGreaterThanOrEqual(0.8);
            expect(result.category?.isLowConfidence).toBe(false);
        });
        it("extracts fields from a grocery store receipt with subtotal and tax", () => {
            const receiptOcr = {
                extractedText: `
WALMART SUPERCENTER
Store #3245
8800 Center Blvd
Tel: (555) 019-2834
08/28/2026  14:22

ORGANIC MILK           4.99
WHEAT BREAD            3.49
APPLES 3LB             5.99
CHICKEN BREAST        14.50
HOUSEHOLD CLEANER      8.99

SUBTOTAL              37.96
SALES TAX (8.25%)      3.13
TOTAL AMOUNT DUE     $41.09
CASH TENDERED         50.00
CHANGE DUE             8.91
        `,
                confidence: 0.91,
                source: "server_fallback"
            };
            const result = parseReceiptOcr(receiptOcr);
            expect(result.merchant.value).toBe("WALMART SUPERCENTER");
            expect(result.merchant.isLowConfidence).toBe(false);
            // Must correctly extract final Total ($41.09) rather than subtotal ($37.96), tax ($3.13), or cash tendered ($50.00)
            expect(result.amount.value).toBe(41.09);
            expect(result.amount.confidence).toBeGreaterThanOrEqual(0.9);
            expect(result.amount.isLowConfidence).toBe(false);
            expect(result.date.value).toBe("2026-08-28");
            expect(result.date.isLowConfidence).toBe(false);
        });
        it("extracts fields from a restaurant receipt with textual date and gratuity", () => {
            const receiptOcr = {
                extractedText: `
THE BISTRO KITCHEN & BAR
Table 14 - Server: Alex
27 Aug 2026 19:30

2x Ribeye Steak        52.00
1x House Red Wine      18.00
1x Tiramisu             9.00
----------------------------
Subtotal:              79.00
Tax:                    6.70
Gratuity (18%):        14.22
GRAND TOTAL:          $99.92
        `,
                confidence: 0.92,
                source: "on_device"
            };
            const result = parseReceiptOcr(receiptOcr);
            expect(result.merchant.value).toBe("THE BISTRO KITCHEN & BAR");
            expect(result.amount.value).toBe(99.92);
            expect(result.date.value).toBe("2026-08-27");
            expect(result.category?.value).toBe("Food");
        });
        it("extracts transport receipts (Uber / Fuel)", () => {
            const receiptOcr = {
                extractedText: `
UBER TRIP RECEIPT
Date: 2026-08-15
Trip to Airport Terminal 2
Distance: 18.4 miles
Fare Amount: $28.50
Tolls: $4.00
TOTAL PAID: $32.50
Visa ending in 9876
        `,
                confidence: 0.96,
                source: "server_fallback"
            };
            const result = parseReceiptOcr(receiptOcr);
            expect(result.merchant.value).toBe("UBER TRIP RECEIPT");
            expect(result.amount.value).toBe(32.50);
            expect(result.date.value).toBe("2026-08-15");
            expect(result.category?.value).toBe("Transport");
        });
    });
    describe("2. Clean Fallback & Low-Confidence Flags on Incomplete/Blurry Receipts", () => {
        it("flags low confidence when total amount is missing or ambiguous", () => {
            const blurryReceipt = {
                extractedText: `
CORNER BAKERY
Welcome to our cafe!
Some blurred text...
No total line readable...
Mastercard accepted
        `,
                confidence: 0.45,
                source: "on_device"
            };
            const result = parseReceiptOcr(blurryReceipt, { lowConfidenceThreshold: 0.7 });
            expect(result.merchant.value).toBe("CORNER BAKERY");
            expect(result.amount.value).toBeNull();
            expect(result.amount.isLowConfidence).toBe(true);
            expect(result.amount.confidence).toBe(0);
            expect(result.date.value).toBeNull();
            expect(result.date.isLowConfidence).toBe(true);
        });
        it("handles completely empty OCR text gracefully", () => {
            const emptyOcr = {
                extractedText: "",
                confidence: 0,
                source: "server_fallback"
            };
            const result = parseReceiptOcr(emptyOcr);
            expect(result.merchant.value).toBe("");
            expect(result.merchant.isLowConfidence).toBe(true);
            expect(result.amount.value).toBeNull();
            expect(result.amount.isLowConfidence).toBe(true);
            expect(result.date.value).toBeNull();
            expect(result.date.isLowConfidence).toBe(true);
            expect(result.overallConfidence).toBe(0);
        });
    });
    describe("3. Date Format Normalization", () => {
        it("normalizes various date separators and formats", () => {
            const datesToTest = [
                { raw: "Date: 2026/08/25", expected: "2026-08-25" },
                { raw: "Transaction Date: 08-25-2026", expected: "2026-08-25" },
                { raw: "25-08-2026 10:15", expected: "2026-08-25" },
                { raw: "August 25, 2026", expected: "2026-08-25" },
                { raw: "25 Aug 2026", expected: "2026-08-25" }
            ];
            for (const item of datesToTest) {
                const ocr = {
                    extractedText: `STORE NAME\n${item.raw}\nTOTAL: $10.00`,
                    confidence: 0.9,
                    source: "server_fallback"
                };
                const res = parseReceiptOcr(ocr);
                expect(res.date.value).toBe(item.expected);
                expect(res.date.isLowConfidence).toBe(false);
            }
        });
    });
    describe("4. Confirmation Step & Schema Conformance", () => {
        it("confirms user edits override raw OCR values and conform strictly to createTransactionSchema", () => {
            const rawOcr = {
                extractedText: `
LOCAL CAFE & DINER
Date: 2026-08-26
TOTAL: $14.50
        `,
                confidence: 0.85,
                source: "server_fallback"
            };
            const parsed = parseReceiptOcr(rawOcr);
            // User modifies prefilled values during confirmation step in TransactionForm:
            // - Corrects merchant note to "Team breakfast at Local Cafe"
            // - Adjusts amount to include tip: $18.00
            // - Picks category: "Food"
            const confirmedTransactionPayload = {
                amount: 18.00, // EDITED by user
                type: "expense",
                category: parsed.category?.value || "Food",
                date: parsed.date.value ? new Date(parsed.date.value) : new Date(),
                note: "Team breakfast at Local Cafe", // EDITED by user
                receiptAttachment: null
            };
            const validation = createTransactionSchema.safeParse(confirmedTransactionPayload);
            expect(validation.success).toBe(true);
            const validated = validation.data;
            expect(validated.amount).toBe(18.00); // Confirmed edited amount
            expect(validated.note).toBe("Team breakfast at Local Cafe");
            expect(validated.category).toBe("Food");
            expect(validated.type).toBe("expense");
            // Verify no lingering unvalidated OCR metadata flags
            expect(validated.isOcr).toBeUndefined();
            expect(validated.rawText).toBeUndefined();
        });
    });
});
