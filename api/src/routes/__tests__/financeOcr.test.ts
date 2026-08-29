process.env.VAPID_PUBLIC_KEY = "test-vapid-public-key";
process.env.VAPID_PRIVATE_KEY = "test-vapid-private-key";
process.env.VAPID_SUBJECT = "mailto:test@lifeos.dev";

import { describe, it, expect, vi } from "vitest";
import { Types } from "mongoose";

vi.mock("../../config/env.js", () => ({
  env: {
    NODE_ENV: "test",
    JWT_ACCESS_SECRET: "test-access-secret-123456",
    VAPID_PUBLIC_KEY: "test-vapid-public-key",
    VAPID_PRIVATE_KEY: "test-vapid-private-key",
    VAPID_SUBJECT: "mailto:test@lifeos.dev"
  }
}));

vi.mock("../../db/redis.js", () => ({
  redis: {
    on: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    quit: vi.fn()
  }
}));

import {
  parseReceiptOcr,
  createTransactionSchema,
  type OcrExtractionResult
} from "@lifeos/shared";

vi.mock("../../services/ai/embeddingJob.js", () => ({
  enqueueEmbeddingJob: vi.fn().mockResolvedValue({}),
  deleteEmbedding: vi.fn().mockResolvedValue({})
}));

vi.mock("../../services/budgetService.js", () => ({
  recalculateBudgetSpend: vi.fn().mockResolvedValue({ currentSpend: 59.93, isOverBudget: false }),
  getMonthBounds: vi.fn()
}));

import {
  onTransactionCreated,
  registerOnTransactionCreated
} from "../../services/financeHooks.js";

describe("Finance OCR Integration: Receipt Scanning to Expense Persistence (FR-6.2, UC-3)", () => {
  it("parses raw OCR text into structured transaction fields, allows user edits, and triggers budget creation hooks", async () => {
    // 1. Raw OCR result from unified pipeline (server fallback or on-device)
    const ocrExtraction: OcrExtractionResult = {
      extractedText: `
TARGET STORE #2140
1000 Nicollet Mall, Minneapolis, MN
Date: 2026-08-27
Time: 11:30 AM
----------------------------------
GROCERY ITEMS            24.50
DESK ORGANIZER           18.00
USB-C CABLE              12.99
----------------------------------
SUBTOTAL:                55.49
TAX:                      4.44
TOTAL:                  $59.93
VISA ENDING 4321
      `,
      confidence: 0.93,
      source: "server_fallback"
    };

    // 2. Client runs fast heuristic parser
    const parsedDraft = parseReceiptOcr(ocrExtraction);

    expect(parsedDraft.merchant.value).toBe("TARGET STORE #2140");
    expect(parsedDraft.amount.value).toBe(59.93);
    expect(parsedDraft.date.value).toBe("2026-08-27");
    expect(parsedDraft.category?.value).toBe("Shopping");

    // 3. User reviews pre-filled form in confirmation UI and adjusts values
    const userEditedConfirmedTransaction = {
      amount: 59.93,
      type: "expense" as const,
      category: "Office & Home Supplies", // User customized category
      date: new Date(`${parsedDraft.date.value}T12:00:00.000Z`),
      note: "Target run for office supplies & snacks", // User descriptive note
      receiptAttachment: null // Stubbed for Phase 9 File Storage
    };

    // 4. Validate with standard createTransactionSchema (Phase 4 contract)
    const validation = createTransactionSchema.safeParse(userEditedConfirmedTransaction);
    expect(validation.success).toBe(true);

    const validatedData = validation.data!;
    expect(validatedData.amount).toBe(59.93);
    expect(validatedData.category).toBe("Office & Home Supplies");
    expect(validatedData.note).toBe("Target run for office supplies & snacks");

    // 5. Verify standard budget hooks fire upon saving
    const hookSpy = vi.fn();
    const unregister = registerOnTransactionCreated(hookSpy);

    const createdDoc: any = {
      _id: new Types.ObjectId("662c9f1e9f0b2a001c3d4e90"),
      userId: new Types.ObjectId("662c9f1e9f0b2a001c3d4e00"),
      amount: validatedData.amount,
      type: validatedData.type,
      category: validatedData.category,
      date: validatedData.date,
      note: validatedData.note,
      receiptAttachment: validatedData.receiptAttachment
    };

    await onTransactionCreated(createdDoc);

    expect(hookSpy).toHaveBeenCalledTimes(1);
    expect(hookSpy).toHaveBeenCalledWith(createdDoc);

    unregister();
  });

  it("handles missing receipt fields with graceful fallback requiring explicit manual user input", () => {
    const incompleteOcr: OcrExtractionResult = {
      extractedText: `
UNKNOWN CORNER STORE
Some faded line items...
      `,
      confidence: 0.35,
      source: "on_device"
    };

    const parsed = parseReceiptOcr(incompleteOcr);

    // Incomplete OCR leaves amount and date null with lowConfidence flags
    expect(parsed.amount.value).toBeNull();
    expect(parsed.amount.isLowConfidence).toBe(true);
    expect(parsed.date.value).toBeNull();
    expect(parsed.date.isLowConfidence).toBe(true);

    // Schema validation fails if amount is missing without user filling it in
    const invalidSubmission = {
      amount: parsed.amount.value,
      type: "expense" as const,
      category: "Food",
      date: new Date(),
      note: parsed.merchant.value
    };

    const validation = createTransactionSchema.safeParse(invalidSubmission);
    expect(validation.success).toBe(false); // Fails safely: user must manually fill in amount before saving
  });
});
