---
title: Design system
type: guide
status: accepted
tags: [guide, ui, design-system]
created: 2026-10-11
updated: 2026-10-11
---

# Design system

`packages/ui` is the component library: CSS Modules, Radix for behavior, and Storybook (`pnpm storybook`) as the workshop. Its decision record is [ADR-0008](../adr/0008-css-modules-radix.md).

## Base reset

`@repo/ui/reset.css` is a deliberately heavy-handed reset:

- `box-sizing: border-box` everywhere, and **no default margins on any element**: all spacing comes from components (`gap`, `--space-*`)
- body: `min-height: 100dvh`, line-height 1.5, font smoothing
- media (`img`, `picture`, `video`, `canvas`): block, `max-width: 100%`, `height: auto`
- form controls inherit `font`, `color` and `letter-spacing`
- text: `overflow-wrap: break-word` on paragraphs and headings, balanced headings, `text-wrap: pretty` on paragraphs
- `ul/ol[role="list"]`: no bullets or indent. Use `role="list"` for UI lists, which also keeps list semantics in Safari.
- `:target` scroll margin, so anchor targets clear sticky headers

Import it once, before the tokens:

```ts
import "@repo/ui/reset.css";
import "@repo/ui/tokens.css";
```

It sits in `@layer reset`. Cascade layers lose to unlayered styles whatever their specificity, so any component or app rule adjusts these defaults directly, with no overrides needed.

**Two rules can't be overridden, by design.** They use `!important`, which inside the lowest layer beats every other declaration, inline styles included:

- `[hidden]` always hides, even on elements whose CSS sets `display`.
- With `prefers-reduced-motion: reduce`, every animation and transition is cut to about 0 ms and one iteration, and smooth scrolling is turned off.

Components may still add their own reduced-motion refinements, but they don't have to.

The "Foundations/Reset" story asserts these behaviors in both themes.

## No `!important`

`!important` is not allowed anywhere except the two accessibility guarantees in the base reset (explained there, and the Stylelint exception covers only that block). Linting enforces it:

- **CSS:** Stylelint's `declaration-no-important` and `keyframe-declaration-no-important`, run by `pnpm lint` in every package with CSS.
- **TypeScript:** an ESLint `no-restricted-syntax` rule flags any string or template literal containing `!important` in `.ts`/`.tsx` files (inline `style` values, CSS strings). The `.js` lint configs are exempt, because they have to name the word.

When a style needs to win, use the cascade. The reset is in a lower layer already, so put the rule in the right component, make the selector more specific, or order the rules correctly.

## Tokens

| File                    | Holds                                                                    |
| ----------------------- | ------------------------------------------------------------------------ |
| `src/tokens/palette.ts` | Raw color ramps (`gray`, `violet`, …). Only themes may use it.           |
| `src/tokens/tokens.ts`  | Semantic colors per theme (`themes.light`, `themes.dark`) and the scales |
| `src/tokens/tokens.css` | **Generated**: CSS custom properties. Never edit by hand.                |

To change a token:

1. Edit `tokens.ts`. If it's a new color, add it to `ColorTokens` and to both themes.
2. Run `pnpm --filter @repo/ui tokens:build`.
3. Run `pnpm --filter @repo/ui test`. The contrast tests fail if a text or UI pair drops below WCAG AA in either theme. If you add a new foreground/background combination, add the pair to `PAIRS` in `tokens.test.ts`.

In CSS, use `var(--color-text-muted)`, `var(--space-4)` and so on. In TypeScript, `cssVar("color-accent")` is typed.

**Semantic color roles**:

- `text`, `text-muted`: body text and secondary text
- `bg`, `surface`, `surface-raised`, `surface-hover`: page, sections, cards and popovers, and hover states
- `border`, `border-strong`: decorative borders; input and secondary-button borders, which need 3:1
- `accent`, `accent-hover`, `on-accent`, `accent-subtle`, `accent-text`: brand actions and selected states
- `success-*`, `warning-*`, `danger-*`: status colors; `danger` / `on-danger` for destructive buttons
- `focus-ring`, `overlay`

## Adding a component

1. `src/primitives/<Name>/` for generic building blocks, or `src/patterns/<Name>/` for kudos-specific ones.
2. `<Name>.tsx`, `<Name>.module.css` (tokens only) and `<Name>.stories.tsx`. Don't repeat what the base reset already does (box-sizing, form-control fonts).
3. Interactive behavior gets a **play function** that asserts behavior by role and accessible name, the way users and assistive tech find things.
4. Export it from `src/index.ts` or `src/patterns/index.ts`.
5. Run `pnpm --filter @repo/ui test:storybook`. Every story renders in light and dark, its play function runs, and axe checks it. Any violation fails.

## Accessibility conventions

- Icon-only buttons use `IconButton`, whose `label` prop is required.
- Dialogs need a `title`. Popovers need a `label`.
- Tooltips are supplementary only, never the sole place important information lives.
- Decorative emoji and icons get `aria-hidden`. Reactions put the count and "including yours" in the accessible name.
- Loading regions use `role="status"` or `aria-busy` with visually hidden text, and skeleton shapes are decorative.
- Motion respects `prefers-reduced-motion`.

## Visual review

Chromatic snapshots every story in both themes (`parameters.chromatic.modes`). That doubles the snapshot count, and TurboSnap keeps it to changed stories only.
