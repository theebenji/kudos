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
