import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mobileOcrService,
  mapMlKitResultToUnified,
  type MlKitNativeResult
} from "../mobileOcrService";
import { apiClient } from "../apiClient";

vi.mock("../apiClient", () => ({
  apiClient: {
    post: vi.fn()
  }
}));

describe("Mobile On-Device OCR Pipeline & Adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── 1. Printed Receipt Sample ──────────────────────────────────────────────
  describe("Printed Receipt Sample (High Confidence)", () => {
    const mockPrintedReceiptNative: MlKitNativeResult = {
      text: "BLUE BOTTLE COFFEE\nDate: 2026-08-27\n1x Oat Latte $6.50\n1x Croissant $4.50\nTax: $0.99\nTotal: $11.99\nThank You!",
      blocks: [
        {
          text: "BLUE BOTTLE COFFEE",
          frame: { x: 50, y: 30, width: 300, height: 40 },
          confidence: 0.98,
          lines: [
            {
              text: "BLUE BOTTLE COFFEE",
              frame: { x: 50, y: 30, width: 300, height: 40 },
              confidence: 0.98
            }
          ]
        },
        {
          text: "Date: 2026-08-27",
          frame: { x: 50, y: 80, width: 200, height: 25 },
          confidence: 0.95,
          lines: [
            {
              text: "Date: 2026-08-27",
              frame: { x: 50, y: 80, width: 200, height: 25 },
              confidence: 0.95
            }
          ]
        },
        {
          text: "1x Oat Latte $6.50\n1x Croissant $4.50\nTax: $0.99\nTotal: $11.99",
          frame: { x: 50, y: 120, width: 320, height: 120 },
          confidence: 0.94,
          lines: [
            {
              text: "1x Oat Latte $6.50",
              frame: { x: 50, y: 120, width: 300, height: 25 },
              confidence: 0.96
            },
            {
              text: "1x Croissant $4.50",
              frame: { x: 50, y: 150, width: 300, height: 25 },
              confidence: 0.95
            },
            {
              text: "Tax: $0.99",
              frame: { x: 50, y: 180, width: 200, height: 25 },
              confidence: 0.92
            },
            {
              text: "Total: $11.99",
              frame: { x: 50, y: 210, width: 250, height: 30 },
              confidence: 0.97
            }
          ]
        }
      ]
    };

    it("maps ML Kit native printed receipt result to unified extraction shape with source 'on_device'", () => {
      const unified = mapMlKitResultToUnified(mockPrintedReceiptNative, 45);

      expect(unified.source).toBe("on_device");
      expect(unified.extractedText).toContain("BLUE BOTTLE COFFEE");
      expect(unified.extractedText).toContain("Total: $11.99");
      expect(unified.confidence).toBeGreaterThanOrEqual(0.9);

      // Verify spatial bounding boxes
      expect(unified.blocks).toHaveLength(3);
      expect(unified.blocks![0].boundingBox).toEqual({ x: 50, y: 30, width: 300, height: 40 });
      expect(unified.blocks![2].lines).toHaveLength(4);
      expect(unified.blocks![2].lines![3].text).toBe("Total: $11.99");
      expect(unified.blocks![2].lines![3].confidence).toBe(0.97);

      expect(unified.metadata?.engine).toBe("mlkit_on_device");
      expect(unified.metadata?.processingTimeMs).toBe(45);
    });

    it("extracts text on-device without triggering server fallback when confidence is high", async () => {
      const mockRecognizer = vi.fn().mockResolvedValue(mockPrintedReceiptNative);

      const result = await mobileOcrService.extractText("file:///local/receipt.jpg", {
        recognizerAdapter: mockRecognizer,
        minConfidenceThreshold: 0.5
      });

      expect(mockRecognizer).toHaveBeenCalledWith("file:///local/receipt.jpg");
      expect(apiClient.post).not.toHaveBeenCalled();
      expect(result.source).toBe("on_device");
      expect(result.extractedText).toContain("BLUE BOTTLE COFFEE");
    });
  });

  // ─── 2. Handwritten Note Sample ─────────────────────────────────────────────
  describe("Handwritten Note Sample (Lower Confidence Preservation)", () => {
    const mockHandwrittenNoteNative: MlKitNativeResult = {
      text: "Idea for project architecture:\n- Use CQRS pattern\n- SQLite local cache\n- Need to verify sync conflicts",
      blocks: [
        {
          text: "Idea for project architecture:",
          frame: { x: 20, y: 20, width: 350, height: 40 },
          confidence: 0.65,
          lines: [
            {
              text: "Idea for project architecture:",
              frame: { x: 20, y: 20, width: 350, height: 40 },
              confidence: 0.65
            }
          ]
        },
        {
          text: "- Use CQRS pattern\n- SQLite local cache\n- Need to verify sync conflicts",
          frame: { x: 20, y: 70, width: 380, height: 110 },
          confidence: 0.52,
          lines: [
            {
              text: "- Use CQRS pattern",
              frame: { x: 20, y: 70, width: 300, height: 30 },
              confidence: 0.58
            },
            {
              text: "- SQLite local cache",
              frame: { x: 20, y: 105, width: 320, height: 30 },
              confidence: 0.54
            },
            {
              text: "- Need to verify sync conflicts",
              frame: { x: 20, y: 140, width: 360, height: 35 },
              confidence: 0.44 // Lower confidence for messy cursive line
            }
          ]
        }
      ]
    };

    it("preserves lower confidence scores on handwritten notes for downstream review highlighting", () => {
      const unified = mapMlKitResultToUnified(mockHandwrittenNoteNative, 60);

      expect(unified.source).toBe("on_device");
      expect(unified.extractedText).toContain("CQRS pattern");
      expect(unified.extractedText).toContain("SQLite local cache");

      // Verify lower confidence is preserved, not artificially inflated or dropped
      expect(unified.confidence).toBeLessThan(0.7);
      expect(unified.blocks![1].lines![2].confidence).toBe(0.44);
    });
  });

  // ─── 3. Fallback to Server Flow ─────────────────────────────────────────────
  describe("Server Fallback Flow", () => {
    it("falls back to server-side OCR when on-device recognizer throws an error", async () => {
      const mockFailingRecognizer = vi.fn().mockRejectedValue(new Error("Native ML Kit module unavailable"));

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          extractedText: "FALLBACK TEXT FROM SERVER",
          confidence: 0.95,
          source: "server_fallback"
        }
      });

      const result = await mobileOcrService.extractText("file:///local/image.jpg", {
        recognizerAdapter: mockFailingRecognizer,
        fallbackToServerOnFailure: true
      });

      expect(mockFailingRecognizer).toHaveBeenCalled();
      expect(apiClient.post).toHaveBeenCalledWith("/ocr/extract", expect.any(FormData), expect.any(Object));
      expect(result.source).toBe("server_fallback");
      expect(result.extractedText).toBe("FALLBACK TEXT FROM SERVER");
    });

    it("falls back to server-side OCR when on-device text is empty", async () => {
      const mockEmptyRecognizer = vi.fn().mockResolvedValue({ text: "", blocks: [] });

      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          extractedText: "SERVER RESCUED TEXT",
          confidence: 0.88,
          source: "server_fallback"
        }
      });

      const result = await mobileOcrService.extractText("file:///local/blurry.jpg", {
        recognizerAdapter: mockEmptyRecognizer,
        fallbackToServerOnFailure: true
      });

      expect(mockEmptyRecognizer).toHaveBeenCalled();
      expect(apiClient.post).toHaveBeenCalled();
      expect(result.source).toBe("server_fallback");
      expect(result.extractedText).toBe("SERVER RESCUED TEXT");
    });
  });
});
