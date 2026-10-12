---
title: Product & Technical Spec
type: spec
status: accepted
tags: [spec]
created: 2026-10-11
updated: 2026-10-11
---

# Product & Technical Spec

A tool for recognizing employees: people send **kudos** to coworkers, and each person has a page showing the kudos they've received and given.

- **Purpose:** a portfolio project, built so it can be turned into a real company's internal tool by changing configuration and swapping adapters, not by rewriting. Every "later" item below sits behind an interface.
- **Working name:** "Kudos". The product name lives only in `packages/config/brand.ts`, the root `package.json` and the Compose project name. See [Renaming the project](guides/renaming-the-project.md).

Related: [Architecture](architecture.md) · [Domain model](domain-model.md) · [Glossary](glossary.md) · [ADRs](adr/)

---

## 1. Product

### 1.1 Kudos

| Rule                 | Decision                                                                         |
| -------------------- | -------------------------------------------------------------------------------- |
| Sender               | Exactly one, the signed-in user                                                  |
| Recipients           | 1–10, chosen explicitly. **No self-kudos.**                                      |
| Body                 | Rich text (see §1.2), stored as ProseMirror JSON, plus a derived plain-text copy |
| Value tag            | Optional, one per kudo, chosen from the admin-managed list                       |
| Visibility           | Always public to the whole org                                                   |
| Editing              | The sender can edit; the kudo then shows an "edited" marker                      |
| Deleting             | The sender can soft-delete their own kudos; admins can soft-delete any           |
| Rate limit           | Soft per-user limit of **30 kudos/hour** (API-enforced)                          |
| Budgets / daily caps | None (a later product decision for a real company)                               |

### 1.2 Rich text

- Editor: **Tiptap**.
- Allowed nodes: paragraph, bold, italic, link, bullet/ordered list, **@mention**, **emoji**, **GIF**.
- Rendering uses a strict node allowlist, so raw HTML never reaches the page.
- Body max length: ~500 characters of plain text, enforced on the server.

### 1.3 @mentions

- A mention links to the person's profile and **notifies** them.
- A mention does **not** make the person a recipient. Recipients are a separate, explicit field.

### 1.4 GIFs

- Users search **GIPHY** through an **API proxy**, so the key stays on the server. The proxy applies a content-rating filter (`pg-13` or stricter).
- No uploads.
- When `GIPHY_API_KEY` is missing, the picker falls back to about 20 **bundled GIF URLs** and shows a "demo mode" note. Seed data uses the same set.

### 1.5 Values (categories)

- Managed by admins: create, rename, reorder, **archive**.
- Values are never hard-deleted, so historical kudos keep their tag.
- Archived values can't be chosen for new kudos.

### 1.6 Reactions

- **Any emoji**, Slack-style.
- One reaction per emoji per user per kudo; clicking again removes it.
- No reactions on comments (v1).

### 1.7 Comments

- **Flat**, with no threads.
- Plain text plus emoji.
- The author can edit (shown as "edited") or soft-delete; admins can soft-delete any.

### 1.8 Feed

- The home page shows the global feed, **newest first**, with no algorithmic ranking.
- Filters: **value**, **department/team**, and an **"involving me"** toggle (I sent it, received it, or was mentioned).
- Infinite scroll, using cursor pagination.

### 1.9 Profiles

- Fields: name, avatar, job title, department, team, manager, email, joined date, bio.
- Tabs: **Received** and **Given**, both paginated.
- A **"Give kudos"** button opens the composer with this person already filled in as a recipient.
- Self-editable: **avatar** (upload; generated initials as the fallback) and **bio** (plain text, ≤ 280 chars). Everything else belongs to the directory.

### 1.10 Directory and search

- People search uses fuzzy matching (`pg_trgm`) on name, title and team.
- Kudo full-text search is optional and would use `tsvector` over the plain-text column.
- Everything sits behind a `SearchService`, so Meilisearch or Typesense can replace Postgres later.

### 1.11 Leaderboard (its own page)

- Tabs: **Top recognized** and **Top recognizers**.
- Filters: **value**, and a window of **this month** (default), **this quarter** or **all-time**.
- Shows the **top 10**.
- A kudo to N people counts once for each recipient and once for the sender.
- Soft-deleted kudos and deactivated users are excluded.

### 1.12 Notifications

- Channel: **in-app only** (v1), delivered in **realtime** via GraphQL subscriptions.
- Triggers:
  - a kudo is received
  - someone comments on a kudo you sent or received
  - you're @mentioned
- Reactions show up batched in the notification list, with no toast.
- Built to extend: a `NotificationChannel` interface. Email means adding `EmailChannel` plus per-user preferences. See [ADR-0006](adr/0006-outbox-notifications.md).

### 1.13 Roles

| Capability                                     | Member | Admin |
| ---------------------------------------------- | ------ | ----- |
| Send / edit / delete own kudos and comments    | ✅     | ✅    |
| React, comment, search, view everything public | ✅     | ✅    |
| Manage values                                  | —      | ✅    |
| Soft-delete any kudo or comment                | —      | ✅    |
| Manage user roles, deactivate users            | —      | ✅    |
| Audit view (soft-deleted content)              | —      | ✅    |

### 1.14 Users and lifecycle

- **Demo:** about 50 fake users seeded with Faker. A dev-only "sign in as" picker.
- **Real company:**
  - SSO via OIDC.
  - **Just-in-time provisioning**: a profile is created on first sign-in.
  - A `UserDirectorySource` interface for later HRIS/SCIM sync.
- Users are **deactivated, never deleted**. Their kudos stay visible, attributed to "Former employee".

### 1.15 Deletion

- Kudos and comments are **soft-deleted** (`deletedAt`, `deletedById`).
- Soft-deleted items are hidden everywhere and excluded from leaderboards, but admins can see them in the audit view.
- No hard purge (out of scope).

### 1.16 Routes

| Route               | Page                                                                      |
| ------------------- | ------------------------------------------------------------------------- |
| `/`                 | Feed + composer entry point                                               |
| `/kudos/[id]`       | Kudo permalink / detail                                                   |
| `/people`           | Directory                                                                 |
| `/people/[handle]`  | Profile (Received / Given tabs). Handle comes from the email's local part |
| `/leaderboard`      | Leaderboard                                                               |
| `/notifications`    | Notification list                                                         |
| `/settings/profile` | Edit avatar and bio                                                       |
| `/admin/values`     | Manage values                                                             |
| `/admin/users`      | Manage roles / deactivate                                                 |
| `/admin/audit`      | Soft-deleted content                                                      |
| `/signin`           | Sign in                                                                   |

The composer is a **modal** that can be opened from anywhere.

### 1.17 Accessibility and language

- **WCAG 2.2 AA** is a hard requirement, enforced by axe in Storybook and Playwright.
- English only. Plain strings, with **no translation layer**.
- Responsive down to mobile widths. Light and dark themes, defaulting to the system setting.

---

## 2. Technical

### 2.1 Repository

- **Monorepo:** pnpm workspaces + Turborepo. See [ADR-0001](adr/0001-monorepo.md).

| Package                            | Purpose                                                      |
| ---------------------------------- | ------------------------------------------------------------ |
| `apps/web` (`@repo/web`)           | Next.js App Router frontend                                  |
| `apps/api` (`@repo/api`)           | GraphQL Yoga API + pg-boss worker entry point                |
| `packages/ui` (`@repo/ui`)         | Component library + Storybook                                |
| `packages/db` (`@repo/db`)         | Drizzle schema, migrations, seed                             |
| `packages/config` (`@repo/config`) | Shared tsconfig / eslint / prettier, `brand.ts`, env helpers |

- Scope **`@repo/*`** is neutral and never changes, even if the product is renamed.

### 2.2 Frontend (`apps/web`)

- **Next.js** (App Router). Server components fetch the first page of data; client components handle interaction and subscriptions.
- **Apollo Client** via `@apollo/client-integration-nextjs`. The normalized cache keeps the feed, profile and detail views consistent after a mutation.
- **GraphQL Codegen** `client-preset`, giving typed documents.
- **Auth.js** (v5) with OIDC providers set in config (Google / Entra / Okta), plus a dev-only "sign in as seeded user" picker.

### 2.3 API (`apps/api`)

- A **separate Node service** (GraphQL Yoga). See [ADR-0002](adr/0002-separate-graphql-api.md).
- **Pothos** code-first schema, with the SDL exported for codegen. See [ADR-0003](adr/0003-pothos-code-first.md).
- Pothos plugins:
  - Relay (cursor connections)
  - Errors (mutation results as typed unions)
  - DataLoader (prevents one query per list item, the "N+1" problem)
  - Scope Auth (Member/Admin rules on individual fields, plus the `node`/`nodes` lookups)
- Not the Pothos Drizzle plugin: it needs Drizzle 1.0, which isn't released yet. Types are DataLoader-backed `loadableNode`s over plain Drizzle queries ([ADR-0003](adr/0003-pothos-code-first.md), amended).
- Fields are **non-null by default**; nullable ones opt in, so the SDL states what's guaranteed.
- Auth failures are top-level GraphQL errors. Domain failures (`ValidationError`, `ConflictError`) are returned as data in `<Field>Result` unions.
- Hardening:
  - graphql-armor limits: depth 10, aliases 15, directives 25, tokens 2000, cost 5000. Violations return HTTP 400.
  - introspection and field suggestions disabled in production
  - per-user rate limits (Phase 4)
- Subscriptions over **graphql-ws**.
- `PubSub` interface: in-memory by default, **Redis** chosen by an env var. Redis is required before running more than one API instance.

### 2.4 Auth bridge

- After sign-in, the Next.js server mints a **short-lived signed JWT** (`jose`, 5 min, `iss=kudos-web`, `aud=kudos-api`) carrying only `sub` (userId).
- It is sent as a `Bearer` header on HTTP requests and in `connectionParams` for websockets.
- The API verifies it, then loads the user from the DB on each request. **Role and deactivation come from the DB**, so they're never stale. The API has no knowledge of Auth.js.
- The web app reads and writes the `users` table **only for auth**: the dev picker, and just-in-time provisioning on first SSO sign-in.
- The dev picker is controlled by `AUTH_DEV_LOGIN`, which defaults to on outside production. The Compose demo opts in explicitly.
- Signing is HS256 with a shared secret (demo), moving to RS256 + JWKS for a real deployment.

See [ADR-0005](adr/0005-auth-bridge.md).

### 2.5 Data

- **PostgreSQL 18** with **Drizzle** ORM and migrations. See [ADR-0004](adr/0004-postgres-drizzle.md).
- Ids are time-ordered `uuidv7()` (built into Postgres 18).
- Extensions: `pg_trgm` (fuzzy search).
- Seed: `pnpm db:seed` builds a deterministic demo org of 50 people (including `admin@example.com` and `member@example.com`), with 300 kudos plus reactions, comments and notifications.
- **Outbox + pg-boss** pipeline for notifications. See [ADR-0006](adr/0006-outbox-notifications.md).
- `FileStorage` interface (S3 API): **SeaweedFS** in Docker Compose for dev ([ADR-0011](adr/0011-seaweedfs-replaces-minio.md); MinIO was the original choice), S3/R2 later. Used for avatars.
- `LeaderboardService`: live aggregate SQL for now, which can become a materialized view refreshed by pg-boss later.

### 2.6 Component library (`packages/ui`)

- **CSS Modules + Radix** primitives. See [ADR-0008](adr/0008-css-modules-radix.md).
- **Design tokens** are defined in TypeScript (`src/tokens/tokens.ts`) and compiled to CSS custom properties (`tokens.css`, generated and committed). Themes switch via `data-theme="light|dark"` or the system setting. Components may only use semantic tokens, never the raw palette.
  - A unit test enforces WCAG contrast for every foreground/background pair in both themes.
  - A drift test fails if `tokens.css` is stale.
- Exports:
  - **primitives** (`@repo/ui`):
    - Button, IconButton, Spinner, Badge
    - Avatar, AvatarGroup, Card
    - TextField, TextArea
    - Dialog, Popover, Tooltip, Menu, Tabs
    - Skeleton, EmptyState, VisuallyHidden
    - the `formatRelativeTime` helper
  - **patterns** (`@repo/ui/patterns`): KudoCard, ReactionBar, ValueBadge
  - **tokens** (`@repo/ui/tokens`, `@repo/ui/tokens.css`)
- **Base reset:** `@repo/ui/reset.css` (box-sizing `border-box`, body margin, form-control fonts, responsive media) sits in a CSS `@layer reset`. Component and app styles always win over it without overrides. Every consumer imports it before `tokens.css`.
- **The recipient picker** is a multi-select combobox **built in-house on Radix Popover**, following the WAI-ARIA combobox pattern. No second accessibility library (Phase 4).
- The web app consumes it **as source** via `transpilePackages`, with no build step.
- **Storybook** (Vite builder) runs directly against the source.
  - Every story runs as a test **twice**, pinned to the light theme and then the dark one, with axe checks.
  - Chromatic snapshots both themes through `modes`.

### 2.7 Testing

See [ADR-0009](adr/0009-testing-strategy.md).

| Layer             | Tool                                       | Scope                                                                                          |
| ----------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Unit              | Vitest                                     | Domain logic, utilities                                                                        |
| App components    | Vitest + **React Testing Library** (jsdom) | `apps/web` feature components and hooks (Apollo `MockedProvider`, composer, notification bell) |
| UI components     | Storybook interaction tests + axe          | `packages/ui` behavior and accessibility                                                       |
| Visual regression | **Chromatic** (TurboSnap)                  | Every story, run on PRs. Also hosts the published Storybook                                    |
| API integration   | Vitest + Testcontainers (Postgres)         | GraphQL operations against a real DB                                                           |
| E2E               | Playwright                                 | Sign in → send kudo → see on profile → react/comment → notification                            |

### 2.8 Tooling and CI

- ESLint + Prettier, TypeScript in `strict` mode.
- Env variables are validated with **zod** at startup in every app.
- Logging uses **pino** (structured).
- **GitHub Actions** runs lint, typecheck, unit/integration tests, the Storybook build + Chromatic, and Playwright on every PR.
- Changesets: not used, since nothing is published.

### 2.9 Running it

- **Docker Compose** only for now: Postgres, SeaweedFS (S3), API, worker, web.
- Every app has its own Dockerfile, so moving to managed hosting (Vercel / Fly / Neon) is a configuration exercise.
- Storybook is published via Chromatic.

### 2.10 Documentation

See [ADR-0010](adr/0010-docs-and-vault-sync.md).

- `docs/` in the repo is the **source of truth**.
- Conventions:
  - relative markdown links, not wikilinks
  - Mermaid diagrams
  - YAML frontmatter
- `pnpm docs:sync` copies the docs **one way** into the Obsidian vault at `DOCS_VAULT_PATH`, stamping `source: repo` on each note. The vault's `Notes/` folder is never touched.
- Docs are updated in the same PR as the code they describe.

---

## 3. Build phases

| #   | Phase                                                                                       | Status                                 |
| --- | ------------------------------------------------------------------------------------------- | -------------------------------------- |
| 0   | Spec, architecture, ADRs, docs sync                                                         | ✅ done ([note](build-log/phase-0.md)) |
| 1   | Monorepo scaffold, tooling, CI, Docker Compose (Postgres, SeaweedFS), Storybook + Chromatic | ✅ done ([note](build-log/phase-1.md)) |
| 2   | DB schema + seed, API skeleton + auth bridge                                                | ✅ done ([note](build-log/phase-2.md)) |
| 3   | UI primitives + tokens in Storybook                                                         | ✅ done ([note](build-log/phase-3.md)) |
| 4   | Feed, composer (Tiptap / emoji / GIF), profiles                                             | ⏳ next                                |
| 5   | Reactions, comments, mentions, notifications (outbox + subscriptions)                       | —                                      |
| 6   | Directory search, leaderboard, admin pages                                                  | —                                      |
| 7   | Playwright E2E pass + a11y sweep                                                            | —                                      |

Each phase ends with: `SPEC.md` updated if anything changed, a `build-log/phase-N.md` entry, a new ADR for any mid-build decision, and `pnpm docs:sync`.

## 4. Porting to a real company

These swaps need configuration or adapters only. The full list is in [Porting to production](guides/porting-to-production.md).

| Demo                      | Real                                |
| ------------------------- | ----------------------------------- |
| Dev user picker           | OIDC provider(s) via Auth.js config |
| Seeded users              | `UserDirectorySource` → HRIS/SCIM   |
| HS256 shared secret       | RS256 + JWKS                        |
| In-memory PubSub          | Redis                               |
| SeaweedFS                 | S3 / R2                             |
| Bundled GIFs              | GIPHY key                           |
| In-app notifications only | + `EmailChannel`                    |
| Docker Compose            | Managed hosting                     |
