---
title: "Phase 0: Spec and docs"
type: note
status: accepted
tags: [build-log]
created: 2026-10-11
updated: 2026-10-11
---

# Phase 0: Spec and docs

## Built

- A planning session that turned the idea into the [Spec](../SPEC.md).
- [Architecture](../architecture.md), [Domain model](../domain-model.md) (draft), [Glossary](../glossary.md).
- ADRs [0001](../adr/0001-monorepo.md)–[0010](../adr/0010-docs-and-vault-sync.md).
- Guides: [Obsidian sync](../guides/obsidian-sync.md), [Renaming](../guides/renaming-the-project.md), [Porting to production](../guides/porting-to-production.md).
- `scripts/docs-sync.mjs` and a new vault at `~/Dev/kudos-vault`.

## Decisions made mid-flight

- The repo's build log lives in `docs/build-log/`, not `docs/notes/`. On case-insensitive filesystems (macOS's default), `notes/` collided with the vault's protected `Notes/` folder. The sync script now compares protected folder names case-insensitively.

## Open questions

- None blocking.

## Environment notes for Phase 1

- **pnpm is not installed.** Enable it with `corepack enable pnpm`, which comes with Node 24.
- **Docker is not installed.** It's needed for Compose (Postgres, MinIO) and for Testcontainers. Install Docker Desktop or OrbStack before Phase 2.
- Node v24.21.0 is available.

## Next

- Phase 1: the monorepo scaffold, tooling, CI, Docker Compose, and Storybook + Chromatic.
