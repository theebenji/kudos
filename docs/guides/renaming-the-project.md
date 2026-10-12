---
title: Renaming the project
type: guide
status: draft
tags: [guide]
created: 2026-10-11
updated: 2026-10-11
---

# Renaming the project

"Kudos" is a working name. Package names use the neutral `@repo/*` scope, so **import paths never change** when the product is renamed.

## Checklist

1. `packages/config/brand.ts`: display name, tagline, logo _(created in Phase 1)_
2. Root `package.json`: `name`
3. `docker-compose.yml`: top-level `name:` _(Phase 1)_
4. `docs/README.md` title, plus mentions of the name in `docs/SPEC.md`
5. Optional: rename the repo folder, then update `DOCS_VAULT_PATH` and rename the vault folder

Search for any leftovers:

```bash
grep -rni "kudos" --exclude-dir=node_modules --exclude-dir=.git .
```

"Kudo" is also a **domain term** (see the [Glossary](../glossary.md)). Only rename _product-name_ occurrences, not the entity.
