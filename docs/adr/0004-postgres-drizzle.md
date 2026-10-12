---
title: "ADR-0004: PostgreSQL + Drizzle"
type: adr
status: accepted
tags: [adr, database]
created: 2026-10-11
updated: 2026-10-11
supersedes:
superseded-by:
---

# ADR-0004: PostgreSQL + Drizzle

## Context

The data is relational: kudos, recipients, reactions, comments and users. The app also needs fuzzy search, JSON documents for rich text, and a job queue, ideally without adding infrastructure.

## Decision

- **PostgreSQL**, run via Docker Compose.
- **Drizzle** for the ORM and migrations; the schema lives in `packages/db`.
- Postgres also handles:
  - `jsonb` for rich-text documents
  - `pg_trgm` and `tsvector` for search
  - **pg-boss** for jobs (see [ADR-0006](0006-outbox-notifications.md))

## Alternatives considered

- **Prisma**: a heavier runtime and less control over SQL.
- **Kysely**: an excellent query builder, but lacks schema and migration tooling.

## Consequences

- One stateful service (plus SeaweedFS/S3 for files).
- Queries stay close to SQL, which suits the leaderboard aggregates.
- Moving to managed hosting (Neon, RDS) only means changing the connection string.
