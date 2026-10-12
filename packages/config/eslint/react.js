import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import base from "./base.js";

// role="list" on ul/ol is intentional: the reset strips bullets from those lists, and the explicit
// role keeps list semantics in Safari/VoiceOver, which drops them when list-style is none.
export const listRoleException = {
  rules: { "jsx-a11y/no-redundant-roles": ["error", { ul: ["list"], ol: ["list"] }] },
};

/** React libraries (packages/ui). Next apps get jsx-a11y through eslint-config-next. */
export default [
  ...base,
  reactHooks.configs.flat["recommended-latest"] ?? reactHooks.configs.flat.recommended,
  jsxA11y.flatConfigs.recommended,
  listRoleException,
  { languageOptions: { globals: { ...globals.browser } } },
];
