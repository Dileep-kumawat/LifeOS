import { describe, it, expect } from "vitest";
import {
  convertOcrToNoteDraft,
  deriveOcrTitle,
  convertTextToProseMirrorDocument,
  prosemirrorDocSchema,
  createNoteSchema,
  type OcrExtractionResult
} from "@lifeos/shared";

describe("Notes OCR Integration: Photographed Text → Editable Note Pre-fill (FR-5.3)", () => {
  describe("Title Extraction Heuristics & Fallback Logic", () => {
    it("extracts the first meaningful line as title and strips leading markdown/bullet tokens", () => {
      const text = `## Quarterly Strategy Review\n- Goal 1: Increase retention\n- Goal 2: Ship OCR`;
      const title = deriveOcrTitle(text);
      expect(title).toBe("Quarterly Strategy Review");
    });

    it("strips numbered list prefixes from the title", () => {
      const text = `1. Whiteboard Action Items\nDiscussed architecture and DB models.`;
      const title = deriveOcrTitle(text);
      expect(title).toBe("Whiteboard Action Items");
    });

    it("truncates excessively long first lines cleanly", () => {
      const longFirstLine =
        "This is an extraordinarily long handwritten document heading that exceeds normal title length limits and should be truncated cleanly";
      const title = deriveOcrTitle(longFirstLine, { maxTitleLength: 50 });
      expect(title.length).toBeLessThanOrEqual(51);
      expect(title.endsWith("…")).toBe(true);
    });

    it("falls back to 'Scanned note — YYYY-MM-DD' when the text is empty or only whitespace/symbols", () => {
      const fallbackDate = new Date("2026-08-27T12:00:00.000Z");
      expect(deriveOcrTitle("", { fallbackDate })).toBe("Scanned note — 2026-08-27");
      expect(deriveOcrTitle("   \n\n   ", { fallbackDate })).toBe("Scanned note — 2026-08-27");
      expect(deriveOcrTitle("### ... --- !!!", { fallbackDate })).toBe("Scanned note — 2026-08-27");
    });
  });

  describe("ProseMirror Document Conversion & Schema Validation", () => {
    it("converts raw OCR text into a valid minimal TipTap/ProseMirror JSON document", () => {
      const rawOcrText = "Meeting Notes\nDiscussed unified OCR pipeline.\nServer fallback uses BullMQ.";
      const doc = convertTextToProseMirrorDocument(rawOcrText);

      // Verify outer structure matches prosemirrorDocSchema
      const parseResult = prosemirrorDocSchema.safeParse(doc);
      expect(parseResult.success).toBe(true);

      expect(doc.type).toBe("doc");
      expect(doc.content.length).toBe(3);
      expect((doc.content[0] as any).content[0].text).toBe("Meeting Notes");
      expect((doc.content[1] as any).content[0].text).toBe("Discussed unified OCR pipeline.");
      expect((doc.content[2] as any).content[0].text).toBe("Server fallback uses BullMQ.");
    });

    it("handles empty lines as blank paragraph nodes in the ProseMirror doc", () => {
      const rawText = "First paragraph\n\nSecond paragraph";
      const doc = convertTextToProseMirrorDocument(rawText);

      expect(doc.content.length).toBe(3);
      expect(doc.content[0].type).toBe("paragraph");
      expect((doc.content[0] as any).content[0].text).toBe("First paragraph");
      expect(doc.content[1].type).toBe("paragraph");
      expect((doc.content[1] as any).content).toBeUndefined();
      expect(doc.content[2].type).toBe("paragraph");
      expect((doc.content[2] as any).content[0].text).toBe("Second paragraph");
    });
  });

  describe("OCR Note Draft Generation with Confidence Signals", () => {
    it("correctly flags low-confidence regions for user review", () => {
      const ocrResult: OcrExtractionResult = {
        extractedText: "Whiteboard Sprint Planning\nReview blurred formula: x=y^2\nFinal deployment tomorrow",
        confidence: 0.74,
        source: "on_device",
        blocks: [
          {
            text: "Whiteboard Sprint Planning",
            confidence: 0.95,
            lines: [{ text: "Whiteboard Sprint Planning", confidence: 0.95 }]
          },
          {
            text: "Review blurred formula: x=y^2",
            confidence: 0.42,
            lines: [{ text: "Review blurred formula: x=y^2", confidence: 0.42 }]
          },
          {
            text: "Final deployment tomorrow",
            confidence: 0.88,
            lines: [{ text: "Final deployment tomorrow", confidence: 0.88 }]
          }
        ]
      };

      const draft = convertOcrToNoteDraft(ocrResult, { lowConfidenceThreshold: 0.7 });

      expect(draft.title).toBe("Whiteboard Sprint Planning");
      expect(draft.source).toBe("on_device");
      expect(draft.overallConfidence).toBe(0.74);
      expect(draft.lines.length).toBe(3);

      expect(draft.lines[0].isLowConfidence).toBe(false);
      expect(draft.lines[1].isLowConfidence).toBe(true); // 0.42 < 0.7
      expect(draft.lines[2].isLowConfidence).toBe(false);
    });

    it("falls back to text lines when blocks are absent", () => {
      const ocrResult: OcrExtractionResult = {
        extractedText: "Simple note without blocks\nSecond line",
        confidence: 0.55,
        source: "server_fallback"
      };

      const draft = convertOcrToNoteDraft(ocrResult, { lowConfidenceThreshold: 0.7 });

      expect(draft.title).toBe("Simple note without blocks");
      expect(draft.lines.length).toBe(2);
      expect(draft.lines[0].isLowConfidence).toBe(true); // 0.55 < 0.7
      expect(draft.lines[1].isLowConfidence).toBe(true);
    });
  });

  describe("Review & Persistence Behavior", () => {
    it("persists edited text (not raw OCR output) and conforms strictly to standard Note schema", () => {
      const ocrResult: OcrExtractionResult = {
        extractedText: "Receipt Draft\nItems: Cofffe and Croisant",
        confidence: 0.65,
        source: "server_fallback"
      };

      const initialDraft = convertOcrToNoteDraft(ocrResult);
      expect(initialDraft.title).toBe("Receipt Draft");
      expect(initialDraft.bodyText).toContain("Items: Cofffe and Croisant");

      // User corrects mistranscriptions in the review flow
      const correctedTitle = "Morning Coffee Expense Note";
      const correctedBodyText = "Items: Coffee and Croissant\nTotal: $6.50";

      const finalProseMirrorDoc = convertTextToProseMirrorDocument(correctedBodyText);

      const notePayload = {
        title: correctedTitle,
        content: finalProseMirrorDoc,
        folderId: null,
        tags: ["finance", "coffee"]
      };

      // Validate against the exact createNoteSchema from @lifeos/shared
      const validation = createNoteSchema.safeParse(notePayload);
      expect(validation.success).toBe(true);

      // Confirm persisted note has user edits, not raw OCR text
      const validatedData = validation.data!;
      expect(validatedData.title).toBe("Morning Coffee Expense Note");
      expect((validatedData.content as any).content[0].content[0].text).toBe("Items: Coffee and Croissant");
      expect((validatedData.content as any).content[1].content[0].text).toBe("Total: $6.50");

      // Verify note is indistinguishable from manually created note (no leftover isOCR field)
      expect((validatedData as any).isOCR).toBeUndefined();
      expect((validatedData as any).ocrSource).toBeUndefined();
    });
  });
});
