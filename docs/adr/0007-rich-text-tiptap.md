---
title: "ADR-0007: Tiptap rich text stored as ProseMirror JSON"
type: adr
status: accepted
tags: [adr, frontend, security]
created: 2026-10-11
updated: 2026-10-11
supersedes:
superseded-by:
---

# ADR-0007: Tiptap rich text stored as ProseMirror JSON

## Context

Kudo bodies need rich text with emoji, animated GIFs and @mentions. Storing HTML invites XSS (script injection) and makes it hard to extract structured data such as mentions.

## Decision

- The editor is **Tiptap**.
- The body is stored as **ProseMirror JSON** (`jsonb`), plus a derived **plain-text** column used for search, previews and length limits.
- The server **validates the document against a node allowlist**: paragraph, text with bold/italic/link marks, bullet/ordered list, mention, emoji, gif.
- The server extracts mentions from the document.
- Rendering maps each node type to a React component. Raw HTML is never rendered.
- GIF nodes only accept URLs from allowed hosts (GIPHY or the bundled set).

## Consequences

- Safe by construction, and mentions are reliable.
- Changes to the node schema need a migration plan for documents already stored, so new node types should be added carefully.

## Amendment (Phase 4, 2026-10-11)

- **The schema and validator live in `@repo/rich-text`**, shared by the API (validation), the DB seed and the UI editor.
- **Emoji are plain Unicode text, not a node.** That gives one representation, and nothing to render specially.
- **Allowed nodes:** paragraph, hardBreak (Shift+Enter), bullet/ordered list, listItem, text with bold/italic/link marks, mention `{ id: uuid, label }` and gif `{ src, alt, width, height }`.
- **Validation (`validateDoc`):**
  - Zod strips unknown attributes, such as Tiptap's `mentionSuggestionChar` or a link's `target`/`rel`.
  - Links must be http, https or mailto.
  - GIF `src` must be a bundled `/gifs/<slug>.gif` path or GIPHY's media CDN.
  - Limits: 500 plain-text characters, 2 GIFs, 400 nodes, depth 6. The size check runs before parsing.
- **The Tiptap editor is configured to exactly this allowlist**, so it can't produce content the API rejects.
- **Bundled demo GIFs are original artwork**: vector shapes and phrases drawn in headless Chromium and encoded with gifenc (`pnpm --filter @repo/web gifs:generate`). That means no third-party images and no emoji glyphs. The manifest (`BUNDLED_GIFS`) is generated into `@repo/rich-text`.
