---
title: "ADR-0001: pnpm + Turborepo monorepo"
type: adr
status: accepted
tags: [adr, tooling]
created: 2026-10-11
updated: 2026-10-11
supersedes:
superseded-by:
---

# ADR-0001: pnpm + Turborepo monorepo

## Context

The project has four parts: a web app, a GraphQL API, a reusable component library with Storybook, and a shared database layer. Changes often cut across all of them; for example, a new field touches the DB, the API, the UI and a story.

## Decision

- One repository using **pnpm workspaces** + **Turborepo**: `apps/web`, `apps/api`, `packages/ui`, `packages/db`, `packages/config`.
- Packages use the neutral scope **`@repo/*`** so that renaming the product never touches import paths.
- The product name lives only in `packages/config/brand.ts`, the root `package.json` and the Compose project name.

## Alternatives considered

- **Separate repos**: needs versioned publishing between the library and the app, and cross-cutting changes become several PRs.
- **Nx**: more powerful, but more configuration than this project needs.

## Consequences

- Changes across layers land in one atomic PR, and the UI library hot-reloads in the app.
- Turborepo caches tasks. Remote caching is off for now.
- If the UI library is ever published to npm, it needs a build step (see [ADR-0008](0008-css-modules-radix.md)).
