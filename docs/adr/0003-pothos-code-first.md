---
title: "ADR-0003: Pothos code-first GraphQL schema"
type: adr
status: accepted
tags: [adr, api, graphql]
created: 2026-10-11
updated: 2026-10-11
supersedes:
superseded-by:
---

# ADR-0003: Pothos code-first GraphQL schema

## Context

We want type safety end to end, from the database through to the UI. A schema-first SDL with generated resolver types works, but the SDL and the resolvers can drift apart.

## Decision

- The schema is written code-first with **Pothos**.
- Plugins:
  - **Relay** (cursor connections)
  - **Errors** (mutation results as typed unions such as `ValidationError | NotAuthorizedError`)
  - **DataLoader** (prevents one query per list item)
  - **Scope Auth** (Member/Admin rules per field)
  - **Drizzle** integration
- The generated SDL is committed as `apps/api/schema.graphql` and consumed by the web app's GraphQL Codegen (`client-preset`).

## Consequences

- Resolver types come straight from TypeScript, so there's no separate step to generate resolver types.
- The committed SDL makes schema changes visible in PR diffs.
- It's tied to the Pothos plugin ecosystem, which is mature and well maintained.

## Amendment (Phase 2, 2026-10-11)

- **The Drizzle plugin isn't used.** `@pothos/plugin-drizzle` requires Drizzle `>=1.0.0-rc.2`, but stable Drizzle is 0.45 and 1.0 is still in beta. Object types are **`loadableNode`s** (DataLoader plugin) over plain Drizzle queries, which batches lookups just as well.
- **Revisit** when Drizzle 1.0 ships: the plugin would let a selection read only the columns it needs, and handle relation loading.
- **Fields are non-null by default** (`defaultFieldNullability: false`).
- The relay `node`/`nodes` fields are gated with `member` scope, because they bypass root-field auth.
