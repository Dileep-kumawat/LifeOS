import { describe, it, expect } from "vitest";
import {
  convertTextToProseMirrorDoc,
  convertProseMirrorDocToText
} from "../notes/proseMirrorUtils";

describe("Notes Module: TipTap / ProseMirror Document Compatibility", () => {
  it("converts markdown headings and bullet lists into standard ProseMirror JSON tree", () => {
    const rawNote = `# Project Roadmap
## Q3 Deliverables
- Complete offline sync
- Verify UC-4 tests
1. Step one
Regular paragraph text with details.`;

    const { proseMirrorJson, contentText } = convertTextToProseMirrorDoc(rawNote);

    expect(contentText).toBe(rawNote);

    const doc = JSON.parse(proseMirrorJson);
    expect(doc.type).toBe("doc");
    expect(Array.isArray(doc.content)).toBe(true);

    // Verify H1
    const h1Node = doc.content.find((n: any) => n.type === "heading" && n.attrs?.level === 1);
    expect(h1Node).toBeDefined();
    expect(h1Node.content[0].text).toBe("Project Roadmap");

    // Verify H2
    const h2Node = doc.content.find((n: any) => n.type === "heading" && n.attrs?.level === 2);
    expect(h2Node).toBeDefined();
    expect(h2Node.content[0].text).toBe("Q3 Deliverables");

    // Verify Bullet List
    const listNode = doc.content.find((n: any) => n.type === "bulletList");
    expect(listNode).toBeDefined();
    expect(listNode.content.length).toBe(2);
  });

  it("converts ProseMirror JSON back into editable formatted text without data loss", () => {
    const originalText = `# Meeting Notes
- Item A
- Item B
Follow up tomorrow.`;

    const { proseMirrorJson } = convertTextToProseMirrorDoc(originalText);
    const reconstructed = convertProseMirrorDocToText(proseMirrorJson);

    expect(reconstructed).toContain("# Meeting Notes");
    expect(reconstructed).toContain("- Item A");
    expect(reconstructed).toContain("- Item B");
    expect(reconstructed).toContain("Follow up tomorrow.");
  });
});
