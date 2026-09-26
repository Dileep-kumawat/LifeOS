import { describe, it, expect } from "vitest";
import { normalizeToProseMirrorDoc } from "../NoteEditor";
import type { ProseMirrorDoc } from "../types";

describe("Note Content Normalization & Fallbacks", () => {
  it("normalizes undefined or null into a valid empty ProseMirror doc", () => {
    expect(normalizeToProseMirrorDoc(undefined)).toEqual({ type: "doc", content: [] });
    expect(normalizeToProseMirrorDoc(null)).toEqual({ type: "doc", content: [] });
  });

  it("preserves an existing valid ProseMirror doc", () => {
    const validDoc: ProseMirrorDoc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello World" }]
        }
      ]
    };
    expect(normalizeToProseMirrorDoc(validDoc)).toEqual(validDoc);
  });

  it("parses serialized JSON string into a ProseMirror doc", () => {
    const docObj: ProseMirrorDoc = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Title" }]
        }
      ]
    };
    const jsonStr = JSON.stringify(docObj);
    expect(normalizeToProseMirrorDoc(jsonStr)).toEqual(docObj);
  });

  it("converts legacy plain-text or markdown string gracefully into ProseMirror paragraph nodes", () => {
    const plainText = "First line of legacy note\nSecond line of note";
    const result = normalizeToProseMirrorDoc(plainText);

    expect(result.type).toBe("doc");
    expect(result.content).toBeDefined();
    expect(result.content).toHaveLength(2);
    expect(result.content![0]).toEqual({
      type: "paragraph",
      content: [{ type: "text", text: "First line of legacy note" }]
    });
    expect(result.content![1]).toEqual({
      type: "paragraph",
      content: [{ type: "text", text: "Second line of note" }]
    });
  });

  it("handles empty string gracefully", () => {
    const result = normalizeToProseMirrorDoc("");
    expect(result.type).toBe("doc");
    expect(result.content).toEqual([]);
  });
});
