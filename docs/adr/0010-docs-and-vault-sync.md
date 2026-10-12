---
title: "ADR-0010: Docs in repo, one-way sync to Obsidian"
type: adr
status: accepted
tags: [adr, docs]
created: 2026-10-11
updated: 2026-10-11
supersedes:
superseded-by:
---

# ADR-0010: Docs in repo, one-way sync to Obsidian

## Context

Docs should be readable and shareable in Obsidian, and also be versioned and reviewed alongside the code.

## Decision

- `docs/` in the repo is the **source of truth**.
- `pnpm docs:sync` (implemented in `scripts/docs-sync.mjs`) copies it **one way** into a separate vault at `DOCS_VAULT_PATH` (set in `.env.local`, never committed).
- The sync adds `source: repo` to each note's frontmatter and removes vault files that no longer exist in `docs/`.
- It **never touches** the vault's `Notes/` folder (your own notes), `.obsidian/` or `.trash/`.
- Conventions:
  - **relative markdown links**, not `[[wikilinks]]`
  - **Mermaid** diagrams
  - YAML frontmatter (`title`, `type`, `status`, `tags`, `created`, `updated`)
- No `.obsidian/` folder is committed to the repo.

## Alternatives considered

- **The `docs/` folder as the vault itself**: simpler, but you chose a separate vault.
- **Symlinks**: Obsidian's symlink handling is unreliable.
- **Two-way sync**: conflicts and silent overwrites.

## Consequences

- Edits made in the vault outside `Notes/` are overwritten on the next sync.
- The docs render the same on GitHub, in an editor and in Obsidian.
