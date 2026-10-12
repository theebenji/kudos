---
title: "Phase 1: Monorepo scaffold"
type: note
status: accepted
tags: [build-log]
created: 2026-10-11
updated: 2026-10-11
---

# Phase 1: Monorepo scaffold

## Built

- **Workspace**: pnpm 12 workspaces + Turborepo 2 (`dev`, `build`, `lint`, `typecheck`, `test`, `test:storybook`).
- **`@repo/config`**:
  - shared tsconfigs (strict, plus `noUncheckedIndexedAccess`)
  - ESLint flat presets (`base`, `react`, `next`)
  - `brand.ts`, the only place the product name lives in code
- **`@repo/ui`**:
  - starter design tokens as CSS variables, light/dark via `data-theme` or the system setting
  - a `Button` primitive (CSS Modules + Radix `Slot`)
  - Storybook 10 (Vite) with the docs, a11y and vitest addons, and a theme toolbar
  - story tests run in headless Chromium, and **axe violations fail the test**. I checked this with a temporary button that had no accessible name.
- **`@repo/web`**:
  - Next.js 16 App Router, consuming `@repo/ui` as source via `transpilePackages`
  - `/api/health`
  - Vitest + React Testing Library (jsdom)
  - `output: "standalone"` for Docker
- **`@repo/api`**:
  - GraphQL Yoga with a placeholder `health` query (Pothos arrives in Phase 2)
  - environment variables validated with zod, pino logging, graceful shutdown
  - Vitest tests using `yoga.fetch`
- **Docker**:
  - `docker-compose.yml`: Postgres 18 + SeaweedFS by default; API + web under the `app` profile
  - multi-stage Dockerfiles using `turbo prune` and `pnpm deploy --prod`, running as a non-root user
- **CI** (`.github/workflows/ci.yml`):
  - format check, lint, typecheck, tests, builds
  - Storybook tests in Chromium
  - Chromatic via its CLI, skipped with a notice until `CHROMATIC_PROJECT_TOKEN` is set
- **Guide**: [Local setup](../guides/local-setup.md).

## Verified locally

- `lint`, `typecheck`, `test` (3 tests), `build` (web, API, Storybook) and `test:storybook` (4 stories) all pass.
- The API Docker steps were rehearsed without Docker: prune, frozen install, build and prod deploy all work, and the deployed API answers `{ health }` with GraphiQL off in production.
- ~~Not verified: actual `docker compose` / `docker build` runs.~~ **Verified at the start of Phase 2**, once Docker was installed: both images build (web 292 MB, API 270 MB), all containers report healthy, the API answers `{ health }`, and the web page renders. Anonymous S3 requests get a 403.

## Decisions made mid-flight

- [ADR-0011](../adr/0011-seaweedfs-replaces-minio.md): **SeaweedFS replaces MinIO**, because MinIO's community edition no longer ships images and its repo is archived.
- **TypeScript 6.0, not 7.** typescript-eslint supports TypeScript below 6.1 only.
- **ESLint 9, not 10.** `eslint-config-next`'s bundled plugins (react, jsx-a11y, import) don't support ESLint 10 yet. ESLint 9 shows a deprecation notice; revisit when the Next preset catches up.
- **Storybook's Vitest addon instead of the standalone test runner.** It's the Storybook 10 way and runs stories as Vitest tests in a real browser. Same intent as [ADR-0009](../adr/0009-testing-strategy.md).
- **Chromatic runs through its CLI**, not the GitHub Action, to keep third-party Actions to the official ones plus pnpm.
- The Next ESLint preset is applied **before** the shared base, so typescript-eslint's parser wins.
- Obsidian templates are excluded from Prettier, which otherwise breaks the `{{date}}` placeholders.

## Deviations from the spec

- The design tokens are a hand-written starter set. Phase 3 replaces them with tokens defined in TypeScript and compiled to CSS (as specified).
- `packages/db` doesn't exist yet; it's created in Phase 2.

## Open questions

- Should the Storybook a11y tests also run in dark theme? Proposed for Phase 3, when the real tokens land.

## Next

- Phase 2: `packages/db` (Drizzle schema, migrations, Faker seed), Pothos schema, and the auth bridge (Auth.js + JWT). **Requires Docker.**
