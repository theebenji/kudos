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
