import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import base from "./base.js";

/** React libraries (packages/ui). */
export default [
  ...base,
  reactHooks.configs.flat["recommended-latest"] ?? reactHooks.configs.flat.recommended,
  { languageOptions: { globals: { ...globals.browser } } },
];
