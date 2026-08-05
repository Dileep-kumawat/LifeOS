import { describe, it, expect } from "vitest";
import { extractContentText } from "../prosemirror.js";
import { buildNotesListFilter, normalizeSearchTerm, MAX_SEARCH_LENGTH } from "../noteSearch.js";
import {
  computeFolderDepth,
  MAX_FOLDER_DEPTH,
  wouldExceedMaxDepth,
  isFolderInChain,
  reassignNotesToRoot
} from "../noteFolders.js";

// ─── contentText extraction ────────────────────────────────────────────────
describe("extractContentText", () => {
  it("flattens simple paragraphs into a single line", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Hello" }] },
        { type: "paragraph", content: [{ type: "text", text: "world" }] }
      ]
    };
    expect(extractContentText(doc)).toBe("Hello world");
  });

  it("walks nested lists, joining list-item text", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "First" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Second" }] }] }
          ]
        }
      ]
    };
    expect(extractContentText(doc)).toBe("First Second");
  });

  it("includes checkbox / task-item text", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "taskList",
          content: [
            { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Buy milk" }] }] },
            { type: "taskItem", attrs: { checked: true }, content: [{ type: "paragraph", content: [{ type: "text", text: "Write notes spec" }] }] }
          ]
        }
      ]
    };
    const text = extractContentText(doc);
    expect(text).toContain("Buy milk");
    expect(text).toContain("Write notes spec");
  });

  it("extracts text inside deeply nested headings and bold runs", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Section", marks: [{ type: "bold" }] }]
        }
      ]
    };
    expect(extractContentText(doc)).toBe("Section");
  });

  it("collapses runs of whitespace and trims edges", () => {
    expect(extractContentText([{ type: "text", text: "  a   b  " }])).toBe("a b");
  });

  it("yields empty string for documents with no text (e.g. only an image)", () => {
    const doc = { type: "doc", content: [{ type: "image", attrs: { src: "data:image/png;base64,abc" } }] };
    expect(extractContentText(doc)).toBe("");
  });

  it("tolerates non-object / malformed input without throwing", () => {
    expect(extractContentText(null)).toBe("");
    expect(extractContentText(undefined)).toBe("");
    expect(extractContentText("nope")).toBe("");
    expect(extractContentText({})).toBe("");
  });
});

// ─── search validation ─────────────────────────────────────────────────────
describe("normalizeSearchTerm", () => {
  it("returns null for absent or blank queries", () => {
    expect(normalizeSearchTerm(undefined)).toBeNull();
    expect(normalizeSearchTerm(null)).toBeNull();
    expect(normalizeSearchTerm("   ")).toBeNull();
  });

  it("trims a valid term and returns it", () => {
    expect(normalizeSearchTerm("  meet  ")).toBe("meet");
  });

  it("rejects non-string and over-length queries", () => {
    expect(() => normalizeSearchTerm(42)).toThrow();
    expect(() => normalizeSearchTerm("x".repeat(MAX_SEARCH_LENGTH + 1))).toThrow();
    expect(normalizeSearchTerm("x".repeat(MAX_SEARCH_LENGTH))).toHaveLength(MAX_SEARCH_LENGTH);
  });
});

// ─── list filter builder / ranking ─────────────────────────────────────────
describe("buildNotesListFilter", () => {
  it("scopes every query to the user", () => {
    const { filter } = buildNotesListFilter({ userId: "user-1" });
    expect(filter.userId).toBe("user-1");
  });

  it("adds folderId only when it is a valid ObjectId", () => {
    expect(buildNotesListFilter({ userId: "u", folderId: "not-object-id" }).filter.folderId).toBeUndefined();
    expect(buildNotesListFilter({ userId: "u", folderId: "507f1f77bcf86cd799439011" }).filter.folderId).toBe(
      "507f1f77bcf86cd799439011"
    );
  });

  it("adds tag filter to the tags array", () => {
    const { filter } = buildNotesListFilter({ userId: "u", tag: "work" });
    expect(filter.tags).toBe("work");
  });

  it("sorts by recency when there is no search", () => {
    const { sort } = buildNotesListFilter({ userId: "u" });
    expect(sort).toEqual({ updatedAt: -1 });
  });

  it("adds $text search and sorts by textScore relevance — the query path that ranks title matches above body matches (title carries higher index weight)", () => {
    const { filter, sort } = buildNotesListFilter({ userId: "u", search: "meeting", folderId: "507f1f77bcf86cd799439011" });
    expect(filter.$text).toEqual({ $search: "meeting" });
    expect(sort).toEqual({ score: { $meta: "textScore" } });
  });
});

// ─── folder depth cap ──────────────────────────────────────────────────────
describe("folder nesting depth cap", () => {
  const folders = [
    { _id: "a", parentFolderId: null },
    { _id: "b", parentFolderId: "a" },
    { _id: "c", parentFolderId: "b" },
    { _id: "d", parentFolderId: "c" },
    { _id: "e", parentFolderId: "d" },
    { _id: "f", parentFolderId: "e" }
  ];

  it("computes chain depth from the root down", () => {
    expect(computeFolderDepth(folders, "a")).toBe(0);
    expect(computeFolderDepth(folders, "c")).toBe(2);
    expect(computeFolderDepth(folders, "f")).toBe(5);
  });

  it("enforces the configured maximum depth", () => {
    expect(MAX_FOLDER_DEPTH).toBe(5);
    // Child under `f` (depth 5) exceeds the cap.
    expect(wouldExceedMaxDepth(folders, "f")).toBe(true);
    // Child under `e` (depth 4) is fine.
    expect(wouldExceedMaxDepth(folders, "e")).toBe(false);
    // Root-level placement is always fine.
    expect(wouldExceedMaxDepth(folders, null)).toBe(false);
    expect(wouldExceedMaxDepth(folders, undefined)).toBe(false);
  });

  it("guards against cycles without looping forever", () => {
    const cyclic = [
      { _id: "x", parentFolderId: "y" },
      { _id: "y", parentFolderId: "x" }
    ];
    expect(() => computeFolderDepth(cyclic, "x")).not.toThrow();
  });

  it("detects a folder nested under one of its own descendants (a cycle target)", () => {
    expect(isFolderInChain(folders, "f", "a")).toBe(true);
    expect(isFolderInChain(folders, "a", "f")).toBe(false);
  });
});

// ─── folder deletion reassigns notes to root ───────────────────────────────
describe("reassignNotesToRoot", () => {
  it("updates the folder's notes to folderId null and does not delete them", async () => {
    let capturedFilter: unknown;
    let capturedUpdate: unknown;
    const fakeNotes: {
      updateMany(filter: Record<string, unknown>, update: Record<string, unknown>): Promise<{ modifiedCount: number }>;
    } = {
      updateMany: async (filter, update) => {
        capturedFilter = filter;
        capturedUpdate = update;
        return { modifiedCount: 3 };
      }
    };

    const result = await reassignNotesToRoot(fakeNotes, "folder-1", "user-1");

    expect(capturedFilter).toEqual({ folderId: "folder-1", userId: "user-1" });
    expect(capturedUpdate).toEqual({ $set: { folderId: null } });
    expect(result.updatedCount).toBe(3);
  });
});