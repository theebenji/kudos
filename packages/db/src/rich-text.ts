/**
 * Shape of a stored kudo body: a ProseMirror/Tiptap JSON document (ADR-0007).
 * Phase 4 adds the server-side allowlist validator; this module only knows the shape
 * and how to derive the plain-text column and the mention list from it.
 */
export type RichTextMark = { type: "bold" | "italic" } | { type: "link"; attrs: { href: string } };

export type RichTextNode =
  | { type: "paragraph"; content?: RichTextNode[] }
  | { type: "bulletList" | "orderedList"; content?: RichTextNode[] }
  | { type: "listItem"; content?: RichTextNode[] }
  | { type: "text"; text: string; marks?: RichTextMark[] }
  | { type: "mention"; attrs: { id: string; label: string } }
  | { type: "emoji"; attrs: { name: string; emoji: string } }
  | { type: "gif"; attrs: { src: string; alt: string; width: number; height: number } };

export type RichTextDoc = { type: "doc"; content: RichTextNode[] };

const BLOCK_TYPES = new Set(["paragraph", "listItem", "bulletList", "orderedList"]);

/** Plain text used for search, previews and length limits. Mentions render as `@Label`. */
export function toPlainText(doc: RichTextDoc): string {
  const blocks: string[] = [];
  const walk = (nodes: RichTextNode[] | undefined, line: string[]): void => {
    for (const node of nodes ?? []) {
      switch (node.type) {
        case "text":
          line.push(node.text);
          break;
        case "mention":
          line.push(`@${node.attrs.label}`);
          break;
        case "emoji":
          line.push(node.attrs.emoji);
          break;
        case "gif":
          break;
        default:
          if (BLOCK_TYPES.has(node.type) && "content" in node) {
            const inner: string[] = [];
            walk(node.content, inner);
            if (inner.length) blocks.push(inner.join(""));
          }
      }
    }
  };
  walk(doc.content, []);
  return blocks.join("\n").trim();
}

/** Distinct user ids mentioned anywhere in the document. */
export function extractMentionIds(doc: RichTextDoc): string[] {
  const ids = new Set<string>();
  const walk = (nodes: RichTextNode[] | undefined): void => {
    for (const node of nodes ?? []) {
      if (node.type === "mention") ids.add(node.attrs.id);
      else if ("content" in node) walk(node.content);
    }
  };
  walk(doc.content);
  return [...ids];
}
