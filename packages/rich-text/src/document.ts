/**
 * A stored kudo body: a ProseMirror/Tiptap JSON document (ADR-0007).
 * Emoji are plain Unicode inside text nodes; mentions and GIFs are their own nodes.
 */
export type RichTextMark = { type: "bold" | "italic" } | { type: "link"; attrs: { href: string } };

export type RichTextNode =
  | { type: "paragraph"; content?: RichTextNode[] }
  | { type: "bulletList" | "orderedList"; content?: RichTextNode[] }
  | { type: "listItem"; content?: RichTextNode[] }
  | { type: "hardBreak" }
  | { type: "text"; text: string; marks?: RichTextMark[] }
  | { type: "mention"; attrs: { id: string; label: string } }
  | { type: "gif"; attrs: { src: string; alt: string; width: number; height: number } };

export type RichTextDoc = { type: "doc"; content: RichTextNode[] };

const BLOCK_TYPES = new Set(["paragraph", "listItem", "bulletList", "orderedList"]);

/** Plain text used for search, previews and length limits. Mentions render as `@Label`; GIFs are skipped. */
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
        case "hardBreak":
          line.push("\n");
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

/** Distinct user ids mentioned anywhere in the document, in order of first appearance. */
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

/** Count of nodes of one type, e.g. how many GIFs a body has. */
export function countNodes(doc: RichTextDoc, type: RichTextNode["type"]): number {
  let count = 0;
  const walk = (nodes: RichTextNode[] | undefined): void => {
    for (const node of nodes ?? []) {
      if (node.type === type) count += 1;
      if ("content" in node) walk(node.content);
    }
  };
  walk(doc.content);
  return count;
}

/** A doc from plain paragraphs, e.g. for tests and seed data. */
export function docFromText(...paragraphs: string[]): RichTextDoc {
  return {
    type: "doc",
    content: paragraphs.map((text) => ({
      type: "paragraph",
      content: text ? [{ type: "text", text }] : [],
    })),
  };
}
