import type { RichTextDoc } from "@repo/rich-text";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RichText } from "./RichText";

const ID = "0199c3a2-6d1f-7c3e-9a1b-1234567890ab";

describe("RichText", () => {
  it("renders marks, mentions, lists, links and GIFs as elements", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Thanks " },
            { type: "mention", attrs: { id: ID, label: "Ana López" } },
            { type: "text", text: " for this", marks: [{ type: "bold" }] },
            {
              type: "text",
              text: " doc",
              marks: [{ type: "link", attrs: { href: "https://example.com/doc" } }],
            },
          ],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [{ type: "paragraph", content: [{ type: "text", text: "item" }] }],
            },
          ],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "gif",
              attrs: { src: "/gifs/kudos.gif", alt: "Kudos!", width: 240, height: 180 },
            },
          ],
        },
      ],
    } as RichTextDoc;
    render(<RichText doc={doc} />);

    expect(screen.getByRole("link", { name: "@Ana López" })).toHaveAttribute(
      "href",
      `/people/id/${ID}`,
    );
    expect(screen.getByText("for this", { exact: false }).tagName).toBe("STRONG");
    expect(screen.getByRole("link", { name: "doc" })).toHaveAttribute(
      "rel",
      "noopener noreferrer nofollow ugc",
    );
    expect(screen.getByRole("listitem")).toHaveTextContent("item");
    expect(screen.getByRole("img", { name: "Kudos!" })).toHaveAttribute("loading", "lazy");
  });

  it("ignores unknown node types instead of rendering them", () => {
    const doc = {
      type: "doc",
      content: [{ type: "html", html: "<script>alert(1)</script>" }],
    } as unknown as RichTextDoc;
    const { container } = render(<RichText doc={doc} />);
    expect(container.innerHTML).not.toContain("script");
  });
});
