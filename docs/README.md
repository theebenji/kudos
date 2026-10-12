---
title: Kudos — Docs Home
type: guide
status: accepted
tags: [index]
created: 2026-10-11
updated: 2026-10-11
---

# Kudos — Docs Home

The index for the project documentation. The source of truth is `docs/` in the repo; the Obsidian vault is a read-only mirror (see [ADR-0010](adr/0010-docs-and-vault-sync.md)).

## Start here

- [Spec](SPEC.md): what is being built and every decision made so far
- [Architecture](architecture.md): system diagram, auth flow, outbox pipeline, swap points
- [Domain model](domain-model.md): entities, relationships, invariants
- [Glossary](glossary.md)

## Decisions (ADRs)

| #                                            | Decision                         |
| -------------------------------------------- | -------------------------------- |
| [0001](adr/0001-monorepo.md)                 | pnpm + Turborepo monorepo        |
| [0002](adr/0002-separate-graphql-api.md)     | Separate GraphQL API service     |
| [0003](adr/0003-pothos-code-first.md)        | Pothos code-first schema         |
| [0004](adr/0004-postgres-drizzle.md)         | PostgreSQL + Drizzle             |
| [0005](adr/0005-auth-bridge.md)              | Auth.js + JWT bridge             |
| [0006](adr/0006-outbox-notifications.md)     | Outbox + pg-boss notifications   |
| [0007](adr/0007-rich-text-tiptap.md)         | Tiptap / ProseMirror JSON        |
| [0008](adr/0008-css-modules-radix.md)        | CSS Modules + Radix UI library   |
| [0009](adr/0009-testing-strategy.md)         | Layered testing strategy         |
| [0010](adr/0010-docs-and-vault-sync.md)      | Docs in repo, one-way vault sync |
| [0011](adr/0011-seaweedfs-replaces-minio.md) | SeaweedFS replaces MinIO         |

If the Dataview plugin is installed, this query shows the same list:

```dataview
TABLE status, updated FROM "adr" SORT file.name ASC
```

## Guides

- [Syncing docs to Obsidian](guides/obsidian-sync.md)
- [Renaming the project](guides/renaming-the-project.md)
- [Porting to production](guides/porting-to-production.md)
- [Local setup](guides/local-setup.md)

## Build log

- [Phase 0: spec and docs](build-log/phase-0.md)
- [Phase 1: monorepo scaffold](build-log/phase-1.md)
- [Phase 2: database, API, auth bridge](build-log/phase-2.md)

## Templates

- [ADR template](templates/adr.md) · [Phase note template](templates/phase-note.md)
