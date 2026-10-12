import type { RichTextDoc, RichTextMark, RichTextNode } from "@repo/rich-text";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import styles from "./RichText.module.css";

/** Where a mention links: by id, since mentions store ids (resolved to /people/[handle]). */
export const mentionHref = (userId: string) => `/people/id/${userId}`;

function withMarks(text: ReactNode, marks: RichTextMark[] = []): ReactNode {
  return marks.reduce<ReactNode>((child, mark) => {
    switch (mark.type) {
      case "bold":
        return <strong>{child}</strong>;
      case "italic":
        return <em>{child}</em>;
      case "link":
        return (
          <a
            href={mark.attrs.href}
            target="_blank"
            rel="noopener noreferrer nofollow ugc"
            className={styles.link}
          >
            {child}
          </a>
        );
    }
  }, text);
}

function renderNodes(nodes: RichTextNode[] | undefined): ReactNode {
  return nodes?.map((node, i) => <Fragment key={i}>{renderNode(node)}</Fragment>);
}

/**
 * Maps each allowed node type to a React element (ADR-0007). Unknown types render nothing,
 * and no HTML string is ever injected, so stored content can't execute script.
 */
function renderNode(node: RichTextNode): ReactNode {
  switch (node.type) {
    case "paragraph":
      return <p>{renderNodes(node.content)}</p>;
    case "bulletList":
      return <ul>{renderNodes(node.content)}</ul>;
    case "orderedList":
      return <ol>{renderNodes(node.content)}</ol>;
    case "listItem":
      return <li>{renderNodes(node.content)}</li>;
    case "hardBreak":
      return <br />;
    case "text":
      return withMarks(node.text, node.marks);
    case "mention":
      return (
        <Link href={mentionHref(node.attrs.id)} className={styles.mention}>
          @{node.attrs.label}
        </Link>
      );
    case "gif":
      return (
        // eslint-disable-next-line @next/next/no-img-element -- animated GIFs must not go through image optimization
        <img
          src={node.attrs.src}
          alt={node.attrs.alt}
          width={node.attrs.width}
          height={node.attrs.height}
          loading="lazy"
          className={styles.gif}
        />
      );
    default:
      return null;
  }
}

export function RichText({ doc }: { doc: RichTextDoc }) {
  return <div className={styles.richText}>{renderNodes(doc.content)}</div>;
}
