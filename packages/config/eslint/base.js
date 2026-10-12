import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

/** Shared rules for every package. Formatting is Prettier's job, so its conflicts are disabled. */
export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/.next/**", "**/storybook-static/**", "**/coverage/**", "**/gql/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    languageOptions: { globals: { ...globals.node } },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // No `!important` in styles written from TypeScript either (inline `style` values, CSS strings).
      // CSS files are covered by Stylelint's declaration-no-important.
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/!\\s*important/i]",
          message: "Don't use !important; rely on the cascade (see docs/guides/design-system.md).",
        },
        {
          selector: "TemplateElement[value.raw=/!\\s*important/i]",
          message: "Don't use !important; rely on the cascade (see docs/guides/design-system.md).",
        },
      ],
    },
  },
  prettier,
);
