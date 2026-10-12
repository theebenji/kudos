---
title: "Phase 3: Design system"
type: note
status: accepted
tags: [build-log]
created: 2026-10-11
updated: 2026-10-11
---

# Phase 3: Design system

## Built

- **Tokens defined in TypeScript, compiled to CSS**:
  - a palette, light and dark semantic themes, and scales for type, space, radius, size, shadow, motion and z-index
  - `tokens:build` writes `tokens.css`
  - unit tests: **46 contrast checks** (23 pairs × 2 themes) plus a drift check
  - a "Foundations/Tokens" story renders swatches, spacing and type from the same source
- **Primitives:**
  - Button (primary, secondary, ghost and danger variants; small and medium sizes; loading and `asChild`)
  - IconButton (required label), Spinner, Badge
  - Avatar (image with an initials fallback), AvatarGroup, Card
  - TextField and TextArea (label, description, error and counter, all wired with `aria-describedby`)
  - Dialog, Popover, Tooltip, Menu and Tabs (Radix)
  - Skeleton, EmptyState, VisuallyHidden
- **Patterns:**
  - ValueBadge
  - ReactionBar: pressed-state toggles with accessible counts and a "who reacted" tooltip
  - KudoCard:
    - an article named "Sender recognized A, B, and C", with linked names
    - a relative time linked to the kudo's permalink, and an "edited" marker
    - slots for actions, reactions and a footer
    - a pluggable link component, for Next `Link`
- **Helpers:** `initials()` and `formatRelativeTime()` / `formatFullDate()`, all unit-tested.
- **Test setup:** three Vitest projects:
  - `unit` (Node)
  - `storybook-light` and `storybook-dark` (Chromium, axe at `error` level)
- **Chromatic:** `modes` snapshot both themes.
- **Lint:** `jsx-a11y` is added to the shared React ESLint preset.
- **Guide:** [Design system](../guides/design-system.md).

## Verified

- 64 unit tests and **100 story tests** (50 stories × 2 themes) pass, with lint, typecheck and builds green across the monorepo (17 Turborepo tasks).
- **The dark-theme tests do catch dark-only problems.** I temporarily gave dark `text-muted` too little contrast: both dark EmptyState stories failed on `color-contrast` and both light ones passed. Reverted afterwards.
- Screenshots of key stories in both themes, from headless Chromium, found two visual bugs, now fixed:
  1. **Controls overflowed their containers** (the dialog textarea), because Storybook had no CSS reset. Fixed with a standard base reset, `@repo/ui/reset.css`, in `@layer reset`, used by both the web app and Storybook. The redundant per-component `box-sizing` and `font: inherit` lines were removed. A Dialog story assertion fails without the reset (checked: `content-box` ≠ `border-box`).
  2. **The avatar stack clipped initials** at small sizes. The overlap was reduced, and KudoCard no longer repeats recipients as avatars, since its headline already names them.

## Decisions made mid-flight

- No Style Dictionary: a small renderer function plus a drift test is enough.
- Used the unified `radix-ui` package, plus `lucide-react` icons.
- TextArea's counter is part of the accessible description, not hidden, so screen-reader users hear "6 / 280".

- **No `!important`, enforced.** Stylelint is added with `stylelint-config-standard`, `declaration-no-important` and `keyframe-declaration-no-important`, plus an ESLint ban on `!important` in TS strings. Both were checked against probe files. Adopting Stylelint also surfaced 5 `no-descending-specificity` rule-order issues (fixed by reordering, with no behavior change). The prefixed `-webkit-text-size-adjust` in the reset has an explained exception, because iOS Safari needs it.

- **A heavy-handed reset.** All the typical modern-reset rules were added (see the [Design system](../guides/design-system.md) guide). The only `!important` declarations allowed are for `[hidden]` and the global reduced-motion switch; they're documented in the file and fenced by a scoped Stylelint exception, and an `!important` outside that block is still rejected (checked).
  - Verified in Chromium with reduced motion emulated: an unlayered infinite 1s animation becomes one iteration of about 0 ms, and its transition about 0 ms; with no preference it's unchanged.
  - The "Foundations/Reset" story asserts margins, wrapping, lists, control colors, image aspect ratio, `hidden` beating an inline `display: flex`, and the body line-height, in both themes.
  - Redundant `margin: 0` and list resets were removed from components and pages. Kudo bodies now space consecutive blocks explicitly, and the Spinner's own reduced-motion rule was removed because the reset supersedes it.

## Open questions

- ~~Combobox library~~ **Decided: build our own** on Radix Popover, following the WAI-ARIA combobox pattern, to avoid adding a second accessibility library ([ADR-0008](../adr/0008-css-modules-radix.md), amended). The options that were considered:
  - **Ariakit**: accessible combobox with multi-select, unstyled, small
  - **React Aria Components**: very thorough a11y, but brings a larger API surface
  - **Hand-rolled** on the ARIA combobox pattern: full control, but most risk

## Next

- Phase 4:
  - the feed with KudoCard
  - the composer: Tiptap with emoji, GIFs and mentions, plus the recipient picker
  - profiles with Tabs
  - Apollo Client and Codegen
  - the API's kudo types and mutations, with the domain rules from the [Domain model](../domain-model.md)
