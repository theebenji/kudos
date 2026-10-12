import { describe, expect, it } from "vitest";
import { docFromText, extractMentionIds, toPlainText } from "./document";
import { isAllowedGifSrc } from "./gifs";
import { validateDoc } from "./validate";

const ID = "0199c3a2-6d1f-7c3e-9a1b-1234567890ab";
const p = (...content: unknown[]) => ({ type: "paragraph", content });
const text = (t: string, marks?: unknown[]) => ({ type: "text", text: t, ...(marks && { marks }) });
const doc = (...content: unknown[]) => ({ type: "doc", content });

describe("validateDoc", () => {
  it("accepts the allowed nodes and returns plain text", () => {
    const input = doc(
      p(
        text("Thanks "),
        { type: "mention", attrs: { id: ID, label: "Ana López" } },
        text("! 🎉", [{ type: "bold" }]),
      ),
      { type: "bulletList", content: [{ type: "listItem", content: [p(text("for the docs"))] }] },
      p({
        type: "gif",
        attrs: { src: "/gifs/confetti.gif", alt: "Confetti", width: 240, height: 180 },
      }),
    );
    const result = validateDoc(input);
    expect(result.ok && result.text).toBe("Thanks @Ana López! 🎉\nfor the docs");
  });

  it("strips editor-only attributes", () => {
    const result = validateDoc(
      doc(
        p(
          { type: "mention", attrs: { id: ID, label: "Ana", mentionSuggestionChar: "@" } },
          text(" docs", [
            {
              type: "link",
              attrs: { href: "https://example.com", target: "_blank", rel: "noopener" },
            },
          ]),
        ),
      ),
    );
    expect(result.ok && result.doc).toEqual(
      doc(
        p(
          { type: "mention", attrs: { id: ID, label: "Ana" } },
          text(" docs", [{ type: "link", attrs: { href: "https://example.com" } }]),
        ),
      ),
    );
  });

  it.each([
    ["a heading", doc({ type: "heading", attrs: { level: 1 }, content: [text("Hi")] })],
    ["raw HTML smuggled as a node", doc(p({ type: "html", html: "<script>" }))],
    [
      "a javascript: link",
      doc(p(text("x", [{ type: "link", attrs: { href: "javascript:alert(1)" } }]))),
    ],
    [
      "an external image as a GIF",
      doc(
        p({
          type: "gif",
          attrs: { src: "https://evil.example/x.gif", alt: "", width: 1, height: 1 },
        }),
      ),
    ],
    ["a mention with a bad id", doc(p({ type: "mention", attrs: { id: "x", label: "Ana" } }))],
    ["an empty document", doc()],
    ["only whitespace paragraphs", doc(p())],
    ["text over 500 characters", docFromText("a".repeat(501))],
    [
      "three GIFs",
      doc(
        p(
          ...Array.from({ length: 3 }, () => ({
            type: "gif",
            attrs: { src: "/gifs/a.gif", alt: "", width: 1, height: 1 },
          })),
        ),
      ),
    ],
    ["something that isn't a doc", "<p>hello</p>"],
  ])("rejects %s", (_label, input) => {
    expect(validateDoc(input).ok).toBe(false);
  });

  it("rejects absurdly deep nesting before parsing", () => {
    let nested: unknown = p(text("deep"));
    for (let i = 0; i < 10; i++)
      nested = { type: "bulletList", content: [{ type: "listItem", content: [nested] }] };
    const result = validateDoc(doc(nested));
    expect(result).toEqual({
      ok: false,
      issues: [{ path: "body", message: "The message is too complex" }],
    });
  });

  it("reports issues under body", () => {
    const result = validateDoc(docFromText("a".repeat(501)));
    expect(result).toEqual({
      ok: false,
      issues: [{ path: "body", message: "Keep it under 500 characters" }],
    });
  });
});

describe("helpers", () => {
  it("extracts distinct mentions in order", () => {
    const other = "0199c3a2-6d1f-7c3e-9a1b-ba0987654321";
    const input = doc(
      p(
        { type: "mention", attrs: { id: other, label: "B" } },
        { type: "mention", attrs: { id: ID, label: "A" } },
      ),
      p({ type: "mention", attrs: { id: other, label: "B" } }),
    ) as Parameters<typeof extractMentionIds>[0];
    expect(extractMentionIds(input)).toEqual([other, ID]);
  });

  it("keeps hard breaks in plain text", () => {
    expect(
      toPlainText({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "a" },
              { type: "hardBreak" },
              { type: "text", text: "b" },
            ],
          },
        ],
      }),
    ).toBe("a\nb");
  });

  it.each([
    ["/gifs/confetti.gif", true],
    ["/gifs/../secret.gif", false],
    ["https://media2.giphy.com/media/abc/giphy.gif", true],
    ["https://i.giphy.com/abc.gif", true],
    ["https://giphy.com.evil.example/x.gif", false],
    ["http://media.giphy.com/x.gif", false],
  ])("gif src %s → %s", (src, allowed) => {
    expect(isAllowedGifSrc(src)).toBe(allowed);
  });
});
