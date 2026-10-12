import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";
import { renderTokensCss } from "./render-css";
import { type ColorToken, themes } from "./tokens";

/** [foreground, background, minimum ratio]. 4.5 = WCAG AA text; 3 = UI components and focus indicators. */
const PAIRS: [ColorToken, ColorToken, number][] = [
  ["text", "bg", 4.5],
  ["text", "surface", 4.5],
  ["text", "surface-raised", 4.5],
  ["text", "surface-hover", 4.5],
  ["text-muted", "bg", 4.5],
  ["text-muted", "surface", 4.5],
  ["text-muted", "surface-raised", 4.5],
  ["on-accent", "accent", 4.5],
  ["on-accent", "accent-hover", 4.5],
  ["accent-text", "bg", 4.5],
  ["accent-text", "surface", 4.5],
  ["accent-text", "accent-subtle", 4.5],
  ["success-text", "success-subtle", 4.5],
  ["warning-text", "warning-subtle", 4.5],
  ["danger-text", "danger-subtle", 4.5],
  ["danger-text", "bg", 4.5],
  ["on-danger", "danger", 4.5],
  ["on-danger", "danger-hover", 4.5],
  ["border-strong", "bg", 3],
  ["border-strong", "surface", 3],
  ["accent", "bg", 3],
  ["focus-ring", "bg", 3],
  ["focus-ring", "surface", 3],
];

describe.each(Object.entries(themes))("%s theme", (_name, theme) => {
  it.each(PAIRS)("%s on %s meets %d:1", (fg, bg, min) => {
    expect(contrastRatio(theme[fg], theme[bg])).toBeGreaterThanOrEqual(min);
  });
});

it("tokens.css is up to date (run `pnpm --filter @repo/ui tokens:build`)", () => {
  const committed = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");
  expect(committed).toBe(renderTokensCss());
});
