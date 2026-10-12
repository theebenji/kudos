import { fileURLToPath } from "node:url";

/** @type {import("stylelint").Config} */
export default {
  // Resolved from this package, so it works wherever the root stylelint.config.mjs re-exports it.
  extends: [fileURLToPath(import.meta.resolve("stylelint-config-standard"))],
  ignoreFiles: [
    "**/node_modules/**",
    "**/.next/**",
    "**/dist/**",
    "**/storybook-static/**",
    "**/coverage/**",
    // Generated from tokens.ts, which ESLint lints (including the !important ban) and tests verify.
    "**/src/tokens/tokens.css",
  ],
  rules: {
    // Project rule: no `!important`, anywhere. Overrides come from the cascade instead: the base
    // reset lives in `@layer reset`, so any component or app style already wins (ADR-0008).
    "declaration-no-important": [
      true,
      { message: "Don't use !important; rely on the cascade (see docs/guides/design-system.md)" },
    ],
    "keyframe-declaration-no-important": true,
    // CSS Modules class names are used from TypeScript (`styles.counterFull`), so camelCase is fine.
    "selector-class-pattern": [
      "^[a-z][a-zA-Z0-9]*(-[a-zA-Z0-9]+)*$",
      { message: "Use camelCase or kebab-case class names" },
    ],
  },
};
