import { z } from "zod";
import type { RichTextDoc, RichTextNode } from "./document";
import { countNodes, toPlainText } from "./document";
import { isAllowedGifSrc } from "./gifs";

export const LIMITS = {
  /** Plain-text characters (DB check constraint matches). */
  maxTextLength: 500,
  maxGifs: 2,
  maxNodes: 400,
  maxDepth: 6,
} as const;

const safeHref = z
  .string()
  .trim()
  .max(2048)
  .refine((href) => {
    try {
      return ["http:", "https:", "mailto:"].includes(new URL(href).protocol);
    } catch {
      return false;
    }
  }, "Links must be http, https or mailto");

const mark = z.discriminatedUnion("type", [
  z.object({ type: z.literal("bold") }),
  z.object({ type: z.literal("italic") }),
  z.object({ type: z.literal("link"), attrs: z.object({ href: safeHref }) }),
]);

// Recursive node schema. Zod strips unknown keys, so editor-only attrs (e.g. Tiptap's
// `mentionSuggestionChar`, link `target`/`rel`) never reach the database.
const node: z.ZodType<RichTextNode> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({ type: z.literal("paragraph"), content: z.array(inline).optional() }),
    z.object({ type: z.enum(["bulletList", "orderedList"]), content: z.array(listItem).min(1) }),
  ]),
);
const listItem: z.ZodType<RichTextNode> = z.lazy(() =>
  z.object({ type: z.literal("listItem"), content: z.array(node).min(1) }),
);
const inline: z.ZodType<RichTextNode> = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("text"),
    text: z.string().min(1),
    marks: z.array(mark).max(3).optional(),
  }),
  z.object({ type: z.literal("hardBreak") }),
  z.object({
    type: z.literal("mention"),
    attrs: z.object({ id: z.uuid(), label: z.string().trim().min(1).max(100) }),
  }),
  z.object({
    type: z.literal("gif"),
    attrs: z.object({
      src: z.string().refine(isAllowedGifSrc, "GIFs must come from the GIF picker"),
      alt: z.string().trim().max(200).default(""),
      width: z.number().int().positive().max(2000),
      height: z.number().int().positive().max(2000),
    }),
  }),
]);

const docSchema = z.object({ type: z.literal("doc"), content: z.array(node).min(1) });

export type ValidationIssue = { path: string; message: string };
export type ValidationResult =
  { ok: true; doc: RichTextDoc; text: string } | { ok: false; issues: ValidationIssue[] };

function shape(value: unknown, depth = 0): { nodes: number; depth: number } {
  if (!value || typeof value !== "object") return { nodes: 0, depth };
  const content = (value as { content?: unknown }).content;
  const children = Array.isArray(content) ? content.map((c) => shape(c, depth + 1)) : [];
  return {
    nodes: 1 + children.reduce((sum, c) => sum + c.nodes, 0),
    depth: Math.max(depth, ...children.map((c) => c.depth)),
  };
}

/**
 * Validates and normalizes an untrusted kudo body against the node allowlist (ADR-0007).
 * Returns the canonical document and its plain text, or field-style issues under `body`.
 */
export function validateDoc(input: unknown): ValidationResult {
  const size = shape(input);
  if (size.nodes > LIMITS.maxNodes || size.depth > LIMITS.maxDepth) {
    return { ok: false, issues: [{ path: "body", message: "The message is too complex" }] };
  }
  const parsed = docSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => ({
        path: ["body", ...issue.path.map(String)].join("."),
        message: issue.message,
      })),
    };
  }
  const doc = parsed.data as RichTextDoc;
  const text = toPlainText(doc);
  const issues: ValidationIssue[] = [];
  if (text.length === 0 && countNodes(doc, "gif") === 0)
    issues.push({ path: "body", message: "Write a message" });
  if (text.length > LIMITS.maxTextLength) {
    issues.push({ path: "body", message: `Keep it under ${LIMITS.maxTextLength} characters` });
  }
  if (countNodes(doc, "gif") > LIMITS.maxGifs)
    issues.push({ path: "body", message: `At most ${LIMITS.maxGifs} GIFs` });
  return issues.length ? { ok: false, issues } : { ok: true, doc, text };
}
