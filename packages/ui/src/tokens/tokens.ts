import { palette as p } from "./palette";

/**
 * Design tokens — the single source of truth (ADR-0008).
 * `pnpm --filter @repo/ui tokens:build` compiles these into tokens.css as CSS custom properties.
 * Components reference only the generated variables (e.g. `var(--color-text-muted)`).
 */

/** Semantic colors. Every theme must define every key; tests enforce WCAG contrast between pairs. */
export type ColorTokens = {
  bg: string;
  surface: string;
  "surface-raised": string;
  "surface-hover": string;
  border: string;
  "border-strong": string;
  text: string;
  "text-muted": string;
  accent: string;
  "accent-hover": string;
  "accent-subtle": string;
  "accent-text": string;
  "on-accent": string;
  "success-subtle": string;
  "success-text": string;
  "warning-subtle": string;
  "warning-text": string;
  danger: string;
  "danger-hover": string;
  "danger-subtle": string;
  "danger-text": string;
  "on-danger": string;
  "focus-ring": string;
  overlay: string;
};

export const themes: Record<"light" | "dark", ColorTokens> = {
  light: {
    bg: p.gray[0],
    surface: p.gray[50],
    "surface-raised": p.gray[0],
    "surface-hover": p.gray[100],
    border: p.gray[200],
    "border-strong": p.gray[500],
    text: p.gray[900],
    "text-muted": p.gray[600],
    accent: p.violet[600],
    "accent-hover": p.violet[700],
    "accent-subtle": p.violet[50],
    "accent-text": p.violet[700],
    "on-accent": p.gray[0],
    "success-subtle": p.green[50],
    "success-text": p.green[700],
    "warning-subtle": p.amber[50],
    "warning-text": p.amber[800],
    danger: p.red[700],
    "danger-hover": p.red[800],
    "danger-subtle": p.red[50],
    "danger-text": p.red[700],
    "on-danger": p.gray[0],
    "focus-ring": p.violet[600],
    overlay: "rgb(15 16 19 / 0.5)",
  },
  dark: {
    bg: p.gray[950],
    surface: p.gray[900],
    "surface-raised": p.gray[850],
    "surface-hover": p.gray[800],
    border: p.gray[800],
    "border-strong": p.gray[500],
    text: p.gray[100],
    "text-muted": p.gray[400],
    accent: p.violet[400],
    "accent-hover": p.violet[300],
    "accent-subtle": p.violet[950],
    "accent-text": p.violet[300],
    "on-accent": p.gray[950],
    "success-subtle": p.green[950],
    "success-text": p.green[300],
    "warning-subtle": p.amber[950],
    "warning-text": p.amber[300],
    danger: p.red[600],
    "danger-hover": p.red[700],
    "danger-subtle": p.red[950],
    "danger-text": p.red[300],
    "on-danger": p.gray[0],
    "focus-ring": p.violet[300],
    overlay: "rgb(0 0 0 / 0.6)",
  },
};

/** Theme-independent scales. Keys become `--<group>-<key>`, e.g. `--space-4`, `--radius-md`. */
export const scales = {
  font: {
    sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    mono: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  },
  "font-size": {
    xs: "0.75rem",
    sm: "0.875rem",
    md: "1rem",
    lg: "1.125rem",
    xl: "1.375rem",
    "2xl": "1.75rem",
  },
  "font-weight": { regular: "400", medium: "500", semibold: "600", bold: "700" },
  "line-height": { tight: "1.25", normal: "1.5" },
  space: {
    0: "0",
    1: "0.25rem",
    2: "0.5rem",
    3: "0.75rem",
    4: "1rem",
    5: "1.25rem",
    6: "1.5rem",
    8: "2rem",
    10: "2.5rem",
    12: "3rem",
  },
  radius: { sm: "0.25rem", md: "0.5rem", lg: "0.75rem", xl: "1rem", full: "9999px" },
  size: {
    "control-sm": "2rem",
    "control-md": "2.5rem",
    "avatar-xs": "1.5rem",
    "avatar-sm": "2rem",
    "avatar-md": "2.5rem",
    "avatar-lg": "4rem",
  },
  shadow: {
    sm: "0 1px 2px rgb(0 0 0 / 0.06)",
    md: "0 4px 12px rgb(0 0 0 / 0.1)",
    lg: "0 12px 32px rgb(0 0 0 / 0.18)",
  },
  duration: { fast: "120ms", normal: "200ms" },
  easing: { standard: "cubic-bezier(0.2, 0, 0, 1)" },
  z: { dropdown: "100", overlay: "200", modal: "210", toast: "300", tooltip: "400" },
} as const;

export type ColorToken = keyof ColorTokens;
type ScaleToken = {
  [G in keyof typeof scales]: `${G}-${Extract<keyof (typeof scales)[G], string | number>}`;
}[keyof typeof scales];
export type TokenName = `color-${ColorToken}` | ScaleToken;

/** Typed `var(--…)` reference for the rare cases a token is needed in TypeScript (e.g. inline SVG). */
export const cssVar = (name: TokenName) => `var(--${name})`;
