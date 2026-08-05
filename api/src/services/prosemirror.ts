interface ProseMirrorNode {
  type?: string;
  text?: string;
  content?: ProseMirrorNode[];
  [key: string]: unknown;
}

/**
 * Walks a TipTap/ProseMirror JSON document tree and concatenates text nodes in
 * document order. Runs server-side on every save to produce `contentText` —
 * the plain-text mirror the MongoDB text index actually searches over, since a
 * structured JSON blob is not meaningfully indexable as text.
 *
 * Handles nested structures (headings, lists, task items/checkboxes) because
 * those wrap their text in nested `content` arrays. Images and other
 * leaf/void nodes contribute no text. Whitespace is collapsed so previews and
 * full-text search see a single clean line.
 */
export function extractContentText(doc: unknown): string {
  const parts: string[] = [];
  const stack: unknown[] = [];

  if (Array.isArray(doc)) {
    stack.push(...doc);
  } else if (doc && typeof doc === "object") {
    stack.push(doc);
  }

  while (stack.length > 0) {
    const node = stack.pop() as ProseMirrorNode | undefined;
    if (!node || typeof node !== "object") continue;

    if (typeof node.text === "string") {
      parts.push(node.text);
    }

    if (Array.isArray(node.content)) {
      // Push in reverse so items are processed in document order.
      for (let i = node.content.length - 1; i >= 0; i--) {
        stack.push(node.content[i]);
      }
    }
  }

  return parts.join(" ").replace(/\s+/g, " ").trim();
}
