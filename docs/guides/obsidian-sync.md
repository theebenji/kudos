---
title: Syncing docs to Obsidian
type: guide
status: accepted
tags: [guide, docs]
created: 2026-10-11
updated: 2026-10-11
---

# Syncing docs to Obsidian

`docs/` is the source of truth. The vault is a mirror that's only updated one way (see [ADR-0010](../adr/0010-docs-and-vault-sync.md)).

## One-time setup

1. Set the vault path in `.env.local` at the repo root. The file is gitignored.
   ```
   DOCS_VAULT_PATH=/Users/you/Dev/kudos-vault
   ```
2. In Obsidian, choose **Open folder as vault** and pick that folder.
3. Recommended Obsidian settings:
   - _Files & Links → Use [[Wikilinks]]_: **off**
   - _New link format_: **Relative path to file**
   - _Templates (core plugin) → Template folder_: `templates`
   - Optional: install **Dataview** for the query on the docs home page.

## Syncing

```bash
pnpm docs:sync      # or: node scripts/docs-sync.mjs
```

- Copies `docs/` into the vault and adds `source: repo` to each note's frontmatter.
- Deletes vault files whose source was removed from `docs/`.
- **Never touches** `Notes/`, `.obsidian/` or `.trash/`.
- Does nothing if `DOCS_VAULT_PATH` isn't set.

## Where to write what

| You want to…                     | Write it in                    |
| -------------------------------- | ------------------------------ |
| Change a decision, spec or guide | `docs/` in the repo (via a PR) |
| Jot down personal notes or ideas | `Notes/` in the vault          |
