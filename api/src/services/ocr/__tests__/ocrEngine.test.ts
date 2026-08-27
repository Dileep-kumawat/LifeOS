import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractTextFromImage } from "../ocrEngine.js";

// Mock tesseract.js
vi.mock("tesseract.js", () => {
  return {
    createWorker: vi.fn().mockImplementation(async () => {
      return {
        recognize: vi.fn().mockResolvedValue({
          data: {
            text: "GROCERY STORE\nMilk $3.50\nBread $2.00\nTotal $5.50\n",
            confidence: 92,
            blocks: [
              {
                text: "GROCERY STORE",
                confidence: 95,
                bbox: { x0: 10, y0: 10, x1: 200, y1: 40 },
                lines: [
                  {
                    text: "GROCERY STORE",
                    confidence: 95,
                    bbox: { x0: 10, y0: 10, x1: 200, y1: 40 }
                  }
                ]
              },
              {
                text: "Milk $3.50\nBread $2.00\nTotal $5.50",
                confidence: 90,
                bbox: { x0: 10, y0: 50, x1: 250, y1: 150 },
                lines: [
                  {
                    text: "Milk $3.50",
                    confidence: 92,
                    bbox: { x0: 10, y0: 50, x1: 200, y1: 75 }
                  },
                  {
                    text: "Bread $2.00",
                    confidence: 91,
                    bbox: { x0: 10, y0: 80, x1: 200, y1: 105 }
                  },
                  {
                    text: "Total $5.50",
                    confidence: 88,
                    bbox: { x0: 10, y0: 110, x1: 220, y1: 140 }
                  }
                ]
              }
            ]
          }
        }),
        terminate: vi.fn().mockResolvedValue(undefined)
      };
    })
  };
});

describe("Server-Side OCR Engine (Tesseract)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("extracts text and normalizes confidence and bounding boxes", async () => {
    const fakeBuffer = Buffer.from("fake-image-bytes");
    const result = await extractTextFromImage(fakeBuffer, "image/jpeg");

    expect(result.source).toBe("server_fallback");
    expect(result.extractedText).toContain("GROCERY STORE");
    expect(result.extractedText).toContain("Total $5.50");
    expect(result.confidence).toBe(0.92); // 92% normalized to 0.92

    // Check blocks structure
    expect(result.blocks).toHaveLength(2);
    expect(result.blocks![0].text).toBe("GROCERY STORE");
    expect(result.blocks![0].confidence).toBe(0.95);
    expect(result.blocks![0].boundingBox).toEqual({
      x: 10,
      y: 10,
      width: 190,
      height: 30
    });

    // Check lines structure
    expect(result.blocks![1].lines).toHaveLength(3);
    expect(result.blocks![1].lines![2].text).toBe("Total $5.50");
    expect(result.blocks![1].lines![2].confidence).toBe(0.88);
    expect(result.blocks![1].lines![2].boundingBox).toEqual({
      x: 10,
      y: 110,
      width: 210,
      height: 30
    });

    // Check metadata
    expect(result.metadata?.engine).toBe("tesseract");
    expect(result.metadata?.mimeType).toBe("image/jpeg");
    expect(result.metadata?.fileSize).toBe(fakeBuffer.length);
    expect(result.metadata?.processingTimeMs).toBeGreaterThanOrEqual(0);
  });
});
