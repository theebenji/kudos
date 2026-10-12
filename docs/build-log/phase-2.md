---
title: "Phase 2: Database, API skeleton, auth bridge"
type: note
status: accepted
tags: [build-log]
created: 2026-10-11
updated: 2026-10-11
---

# Phase 2: Database, API skeleton, auth bridge

## Built

- **`@repo/db`**:
  - The Drizzle schema for every entity in the [Domain model](../domain-model.md). Ids are `uuidv7()`, and the schema has check constraints, partial and trigram indexes.
  - Two migrations: `pg_trgm`, then the initial schema.
  - Rich-text document types with `toPlainText` and `extractMentionIds`.
  - Auth-only user queries, including handle generation.
  - A **deterministic seed** (`faker.seed(2026)`):
    - 50 people with a reporting chain, one former employee, and fixed `admin@example.com` / `member@example.com` accounts
    - 6 values plus 1 archived
    - 300 kudos with mentions, plus 904 reactions, 434 comments and 437 notifications
    - edited and soft-deleted examples
- **`@repo/api`**:
  - **Pothos** with the scope-auth, errors, relay and dataloader plugins.
  - Types: `User`, `Value` and `Node`.
  - Queries: `viewer`, `user(handle)`, `users` (keyset cursor pagination), `values`.
  - Mutation: `createValue` (admin), with `ValidationError` / `ConflictError` returned as data.
  - "Former employee" masking for non-admins.
  - graphql-armor limits, and introspection off in production.
  - The committed `schema.graphql`, with a drift test.
  - Bundled with **tsup** (workspace packages inlined). `dist/migrate.js` serves as the container migration step.
- **Auth bridge**:
  - **Auth.js v5** with a lazy config:
    - a dev "sign in as" provider, controlled by `AUTH_DEV_LOGIN`
    - a generic OIDC provider for company SSO, enabled when its env vars are set
    - just-in-time provisioning
  - `/api/token` mints a 5-minute HS256 JWT (`sub` only).
  - `proxy.ts` protects every page.
  - The sign-in page is guarded against open redirects.
  - The temporary home page proves the round trip by showing the viewer and values from the API.
- **Docker**: a `migrate` one-shot service, auth and DB env wiring, and web waiting for a healthy API.
- **Config**: one root `.env` for every app (`.env.example` documents it all), plus the `db:*` and `schema:print` root scripts.

## Verified

- **API integration tests against a real Postgres via Testcontainers (20).** They cover:
  - tokens: missing, valid, expired, wrong secret, wrong issuer, wrong audience, deactivated user
  - `node` lookup gating
  - pagination order and cursors, manager lookup, "Former employee" masking
  - archived values
  - admin-only `createValue`, including its validation errors and its case-insensitive conflict check
  - the depth limit (HTTP 400), and introspection disabled in production
  - schema drift
- **Web unit tests (10):** the `Welcome` component, and the open-redirect guard.
- **In the browser, dev servers:**
  - an unauthenticated `/` redirects to `/signin`
  - signing in as Avery Admin shows the role from the DB and only the active values
  - `/api/token` returns a `no-store` 300-second token that the API accepts over CORS
  - signing out leads to `/signin`, and the token endpoint then returns 401
- **Containerized production stack:**
  - a fresh database is migrated by the `migrate` service
  - after seeding, signing in as Morgan Member works, and the `callbackUrl` is preserved
- `lint`, `typecheck`, `test`, `build` and `test:storybook` all pass (16 Turborepo tasks).

## Decisions made mid-flight

- **No Pothos Drizzle plugin.** It needs Drizzle 1.0, which isn't released. Using DataLoader `loadableNode`s instead ([ADR-0003](../adr/0003-pothos-code-first.md), amended).
- **The token carries no role.** The API reads role and deactivation from the DB on every request ([ADR-0005](../adr/0005-auth-bridge.md), amended).
- **The web app touches the DB only for auth** (the dev picker and provisioning).
- **`AUTH_DEV_LOGIN` flag** instead of a `NODE_ENV` check, so the production-build demo can opt in.
- **Fields are non-null by default** in the GraphQL schema.
- **The API bundles with tsup** so the `@repo/*` TypeScript sources need no separate build step. The API now uses `Bundler` module resolution.
- **@mentions are only in kudo bodies.** Comments are plain text, as specified, and the glossary is fixed accordingly.

## Gotchas worth remembering

- **Vitest and graphql 17.** Vite's default `development` resolve condition loaded graphql's `__dev__` build for our code, while Node loaded the regular build for dependencies. The result was two graphql instances ("from another module or realm"). Fixed with `ssr.resolve.conditions: ["module", "node"]` in `apps/api/vitest.config.ts`. Overriding `externalConditions` too breaks `pg` (CJS `require` gets ESM).
- **graphql-armor throws by default.** That throw happens mid-validation, and Yoga masks it as a 500 "Unexpected error". Use `propagateOnRejection: false` and report the error through `onReject` → `context.reportError`.
- **Auth.js lazy config.** `auth(callback)` returns a _Promise_ of the handler, so `proxy.ts` must await it inside a named `proxy` function.
- **Next.js env loading.** `@next/env`'s `loadEnvConfig` caches its first load, so it can't add the root `.env`. `next.config.ts` uses `process.loadEnvFile` instead.
- **Prettier.** It must skip generated files (`apps/api/schema.graphql`, `packages/db/drizzle/`), otherwise the schema drift test fails.
- **Next.js and Turborepo write `AGENTS.md` files** when they detect an AI agent: one at the repo root (Turborepo), one at `apps/web` (Next). They're left in place until you decide whether to keep them.

## Open questions

- Should the generated `AGENTS.md` files be kept, or should they be disabled (`agentGuidance: false` in `turbo.json`, `agentRules: false` in `next.config.ts`)?

## Next

- Phase 3: UI primitives plus design tokens defined in TypeScript and compiled to CSS, all in Storybook, with dark-theme a11y runs.
