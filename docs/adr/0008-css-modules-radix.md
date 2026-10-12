---
title: "ADR-0008: Component library with CSS Modules + Radix"
type: adr
status: accepted
tags: [adr, ui, design-system]
created: 2026-10-11
updated: 2026-10-11
supersedes:
superseded-by:
---

# ADR-0008: Component library with CSS Modules + Radix

## Context

The project needs a reusable, accessible component library with Storybook. It must meet WCAG 2.2 AA and support light and dark themes.

## Decision

- `packages/ui` uses **CSS Modules** for styling and **Radix primitives** for accessible behavior.
- **Design tokens** are defined in TypeScript and compiled to CSS custom properties. Themes switch via `data-theme`. Components only reference tokens.
- Exports: primitives (`@repo/ui`) and kudos-specific components (`@repo/ui/patterns`).
- The web app consumes the library **as source** via Next's `transpilePackages`, with no build step.
- **Storybook** runs on the Vite builder.

## Alternatives considered

- **Tailwind + shadcn/ui**: fast to build with, but you chose CSS Modules for plain CSS and clear boundaries.
- **MUI / Mantine**: less ownership of the design.

## Consequences

- No runtime cost for styling.
- Publishing to npm later would need a library build (Vite lib mode or tsup) with CSS extracted.

## Amendment (Phase 3, 2026-10-11)

- **Token pipeline:**
  - `src/tokens/palette.ts` holds the raw color ramps, used only by themes.
  - `src/tokens/tokens.ts` holds the semantic `themes.light` / `themes.dark` plus the scales.
  - `pnpm --filter @repo/ui tokens:build` writes `src/tokens/tokens.css`, which is generated, committed and excluded from Prettier.
  - No build tool such as Style Dictionary: a 40-line renderer is enough.
- **Accessibility enforced at two levels:**
  - Token-pair contrast unit tests: 4.5:1 for text, 3:1 for UI and focus.
  - axe runs on every story in **both** themes. A Vitest project per theme sets `VITE_FORCED_THEME`, which overrides the toolbar.
- **Radix through the unified `radix-ui` package**, which replaces individual `@radix-ui/react-*` packages.
- **Icons:** `lucide-react`.
- **Lint:** `eslint-plugin-jsx-a11y` is added to the shared React preset.
- **A standard base reset ships with the library:** `@repo/ui/reset.css`.
  - It's in `@layer reset`, so unlayered component and app CSS always takes precedence, with no `!important` and no specificity games.
  - The web app and Storybook both import it before `tokens.css`, and components don't repeat its rules.
  - It was added after Storybook, which had no reset, showed a textarea overflowing its dialog. The Dialog story now asserts that the field stays inside the dialog.
- **The reset became deliberately heavy-handed** at your request:
  - a global margin reset, body line-height and min-height, `height: auto` media, control color and letter-spacing inheritance
  - text wrapping defaults, `role="list"` lists, `:target` scroll margin, font smoothing
  - **two exceptions to the `!important` ban**, both accessibility guarantees: `[hidden]` always hides, and reduced motion applies globally. Inside `@layer reset` their `!important` beats everything. The Stylelint exception is scoped to just that block, with a comment explaining why.
- **No `!important`, enforced by linting.**
  - Stylelint (`stylelint-config-standard` plus `declaration-no-important`) runs in `pnpm lint` for `@repo/ui` and `@repo/web`. The shared config lives in `@repo/config/stylelint`.
  - An ESLint rule bans `!important` in TypeScript strings.
  - Generated `tokens.css` is excluded from Stylelint, because its source (`tokens.ts`) is linted and tested.
- **Combobox: built in-house.** It's built on Radix Popover following the [WAI-ARIA combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/), rather than adding Ariakit or React Aria. That keeps one behavior library and one focus-management system (which matters, because the picker lives inside the composer's Radix Dialog). The trade-off is that we own the hard parts: `aria-activedescendant`, live announcements, and keyboard removal of selected chips. Those get thorough interaction tests (Phase 4).
