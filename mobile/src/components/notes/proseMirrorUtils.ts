/**
 * ProseMirror & TipTap JSON Converter Utilities
 *
 * Converts between mobile raw formatted text and standard TipTap/ProseMirror JSON docs.
 */

/**
 * Converts formatted text into a valid ProseMirror / TipTap doc structure.
 */
export function convertTextToProseMirrorDoc(rawText: string): {
  proseMirrorJson: string;
  contentText: string;
} {
  const lines = rawText.split("\n");
  const contentNodes: Array<Record<string, any>> = [];

  let currentBulletList: Record<string, any> | null = null;
  let currentOrderedList: Record<string, any> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const text = trimmed.substring(2);
      const listItem = {
        type: "listItem",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text }]
          }
        ]
      };

      if (currentBulletList) {
        currentBulletList.content.push(listItem);
      } else {
        currentBulletList = {
          type: "bulletList",
          content: [listItem]
        };
        contentNodes.push(currentBulletList);
      }
      currentOrderedList = null;
    } else if (/^\d+\.\s/.test(trimmed)) {
      const match = trimmed.match(/^\d+\.\s(.*)$/);
      const text = match ? match[1] : trimmed;
      const listItem = {
        type: "listItem",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text }]
          }
        ]
      };

      if (currentOrderedList) {
        currentOrderedList.content.push(listItem);
      } else {
        currentOrderedList = {
          type: "orderedList",
          content: [listItem]
        };
        contentNodes.push(currentOrderedList);
      }
      currentBulletList = null;
    } else {
      currentBulletList = null;
      currentOrderedList = null;

      if (!trimmed) {
        contentNodes.push({ type: "paragraph" });
      } else if (trimmed.startsWith("# ")) {
        contentNodes.push({
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: trimmed.substring(2) }]
        });
      } else if (trimmed.startsWith("## ")) {
        contentNodes.push({
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: trimmed.substring(3) }]
        });
      } else {
        contentNodes.push({
          type: "paragraph",
          content: [{ type: "text", text: line }]
        });
      }
    }
  }

  const doc = {
    type: "doc",
    content: contentNodes
  };

  return {
    proseMirrorJson: JSON.stringify(doc),
    contentText: rawText
  };
}

/**
 * Extracts raw editable formatted text from a stored ProseMirror JSON document.
 */
export function convertProseMirrorDocToText(
  docJsonString: string,
  fallbackContentText?: string
): string {
  if (fallbackContentText) return fallbackContentText;
  try {
    const doc = JSON.parse(docJsonString);
    if (doc?.content && Array.isArray(doc.content)) {
      const lines: string[] = [];
      for (const node of doc.content) {
        if (node.type === "heading") {
          const prefix = node.attrs?.level === 2 ? "## " : "# ";
          const text = node.content?.map((c: any) => c.text).join("") || "";
          lines.push(prefix + text);
        } else if (node.type === "bulletList") {
          for (const item of node.content || []) {
            const text = item.content?.[0]?.content?.map((c: any) => c.text).join("") || "";
            lines.push("- " + text);
          }
        } else if (node.type === "orderedList") {
          let num = 1;
          for (const item of node.content || []) {
            const text = item.content?.[0]?.content?.map((c: any) => c.text).join("") || "";
            lines.push(`${num++}. ${text}`);
          }
        } else if (node.type === "paragraph") {
          const text = node.content?.map((c: any) => c.text).join("") || "";
          lines.push(text);
        }
      }
      return lines.join("\n");
    }
  } catch {}
  return "";
}
