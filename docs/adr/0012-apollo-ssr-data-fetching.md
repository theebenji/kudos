---
title: "ADR-0012: Apollo in client components, server-rendered, with a token handoff"
type: adr
status: accepted
tags: [adr, frontend, data]
created: 2026-10-11
updated: 2026-10-11
supersedes:
superseded-by:
---

# ADR-0012: Apollo in client components, server-rendered, with a token handoff

## Context

The Apollo Next.js integration supports two separate data paths: queries in server components (RSC), and queries in client components that are server-rendered (SSR) and then live in the browser cache. Mixing the two for the same data leads to inconsistencies, because RSC data isn't updated by mutations. Kudo data is edited, deleted and created from many places (feed, profile, permalink, composer).

## Decision

- **All kudo and people data goes through client components** using `useSuspenseQuery`. The normalized cache keeps every view consistent after a mutation: deletes evict the kudo, creates refetch the affected lists.
- **Server components only handle** the session, the shell (viewer), page existence (`notFound`) and metadata, through a small typed `apiQuery` helper.
- **Auth across the boundary** ([ADR-0005](0005-auth-bridge.md)):
  - The `(app)` layout mints a 5-minute API token for the request.
  - During SSR, Apollo uses that token.
  - In the browser, a token source starts with the same token, refreshes from `/api/token` before expiry, and sends the user to sign-in on a 401.
- **API URLs are passed at runtime** (`API_URL` for the server, `PUBLIC_API_URL` for browsers) instead of `NEXT_PUBLIC_*` build-time variables, so one Docker image works anywhere.
- **Typed documents** come from GraphQL Codegen (`client-preset`, no fragment masking) and live in the committed `apps/web/gql/`. `pnpm lint` fails if they're stale.
- **Shared fragments** (`KudoFields`) mean every list hits the same cache entries.

## Consequences

- One cache, one source of truth in the browser; no RSC/SSR overlap to reason about.
- Time-relative text can't be part of hydrated HTML, because server and browser clocks and timezones differ. `useNow()` (`useSyncExternalStore`) renders a UTC date during hydration, then the browser's relative time.
- Initial page loads make the GraphQL requests from the Next.js server, which needs network access to the API (`API_URL`).
