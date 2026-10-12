---
title: "ADR-0005: Auth.js with a JWT bridge to the API"
type: adr
status: accepted
tags: [adr, auth, security]
created: 2026-10-11
updated: 2026-10-11
supersedes:
superseded-by:
---

# ADR-0005: Auth.js with a JWT bridge to the API

## Context

Sign-in must work as a demo with no real accounts, and later with company SSO. Auth.js v5 encrypts its session token by default, so a separate API service can't simply read it.

## Decision

- **Auth.js** in `apps/web`, with OIDC providers set in config (Google / Entra / Okta).
- A **dev-only "sign in as seeded user"** provider, available only when `NODE_ENV !== "production"`.
- On first SSO sign-in, a user row is created ("just-in-time provisioning").
- The Next.js server mints a **short-lived JWT** (`jose`, ~5 min) carrying `sub` and `role`. It is sent as a `Bearer` header and in the `graphql-ws` `connectionParams`.
- The client gets tokens from `/api/token` and refreshes them before expiry. Tokens are never stored in `localStorage`.
- The API **only verifies** the token. Signing is HS256 with a shared secret for the demo, moving to **RS256 + JWKS** for production.

## Consequences

- The API knows nothing about identity providers.
- The role in the token can be up to ~5 minutes stale. The API re-checks `deactivated_at` and `role` from the DB for admin mutations.
- Switching to RS256 later only changes environment variables and key distribution.

## Amendment (Phase 2, 2026-10-11)

What changed during implementation:

- **The token carries only `sub`, not `role`.** The API loads the user from the DB on every request, so role changes and deactivations take effect immediately. That replaces the "up to ~5 minutes stale" consequence above. It costs one indexed primary-key lookup per request.
- **The web app reads and writes `users` for auth only**, through `@repo/db` helpers: the dev picker, and just-in-time provisioning. All other data goes through the API.
- **The dev picker is controlled by `AUTH_DEV_LOGIN`** (defaults to on outside production) instead of a `NODE_ENV` check, so the containerized demo, which runs production builds, can opt in explicitly.
- **Auth.js v5 is still tagged beta** (`5.0.0-beta.32`), so it's pinned exactly. Its config is lazy, so `next build` needs no secrets.
