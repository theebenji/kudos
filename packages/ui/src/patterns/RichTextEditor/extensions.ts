import { mergeAttributes, Node } from "@tiptap/core";
import { Placeholder } from "@tiptap/extensions";
import Mention from "@tiptap/extension-mention";
import StarterKit from "@tiptap/starter-kit";
import type { SuggestionOptions } from "@tiptap/suggestion";

/** Inline, atomic GIF node: `{ type: "gif", attrs: { src, alt, width, height } }` (ADR-0007). */
export const Gif = Node.create({
  name: "gif",
  group: "inline",
  inline: true,
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: null },
      alt: { default: "" },
      width: { default: 240 },
      height: { default: 180 },
    };
  },
  parseHTML() {
    return [{ tag: "img[data-gif]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes(HTMLAttributes, { "data-gif": "", class: "kudo-gif" })];
  },
});

/**
 * Exactly the nodes the server's allowlist accepts (packages/rich-text): paragraphs, hard breaks,
 * bold, italic, links, bullet/ordered lists, mentions and GIFs. Everything else is switched off,
 * so the editor can't produce content the API would reject.
 */
export function kudoExtensions(options: {
  placeholder: string;
  suggestion: Omit<SuggestionOptions, "editor">;
}) {
  return [
    StarterKit.configure({
      blockquote: false,
      code: false,
      codeBlock: false,
      heading: false,
      horizontalRule: false,
      strike: false,
      underline: false,
      link: {
        openOnClick: false,
        autolink: true,
        protocols: ["http", "https", "mailto"],
        HTMLAttributes: { rel: "noopener noreferrer nofollow ugc", target: "_blank" },
      },
    }),
    Placeholder.configure({ placeholder: options.placeholder }),
    Mention.configure({
      HTMLAttributes: { class: "kudo-mention" },
      renderText: ({ node }) => `@${node.attrs.label}`,
      suggestion: options.suggestion,
    }),
    Gif,
  ];
}
