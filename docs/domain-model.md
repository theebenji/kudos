---
title: Domain Model
type: spec
status: accepted
tags: [domain, database]
created: 2026-10-11
updated: 2026-10-11
---

# Domain Model

The entities as implemented in `packages/db/src/schema.ts` (Phase 2). Term definitions are in the [Glossary](glossary.md). Every `id` is a time-ordered `uuidv7()`, and every timestamp is `timestamptz`.

```mermaid
erDiagram
  USER ||--o{ KUDO : sends
  USER ||--o{ KUDO_RECIPIENT : receives
  KUDO ||--|{ KUDO_RECIPIENT : has
  KUDO }o--o| VALUE : "tagged with"
  KUDO ||--o{ KUDO_MENTION : contains
  USER ||--o{ KUDO_MENTION : "mentioned in"
  KUDO ||--o{ REACTION : has
  USER ||--o{ REACTION : adds
  KUDO ||--o{ COMMENT : has
  USER ||--o{ COMMENT : writes
  USER ||--o{ NOTIFICATION : receives
  USER ||--o| USER : "managed by"

  USER {
    uuid id PK
    text email UK
    text handle UK
    text name
    text title
    text department
    text team
    uuid manager_id FK
    text avatar_key
    text bio
    enum role "member | admin"
    date joined_on
    timestamptz created_at
    timestamptz deactivated_at
  }
  VALUE {
    uuid id PK
    text name UK
    text description
    text emoji
    int sort_order
    timestamptz archived_at
  }
  KUDO {
    uuid id PK
    uuid sender_id FK
    uuid value_id FK
    jsonb body_doc "ProseMirror JSON"
    text body_text "derived plain text"
    timestamptz created_at
    timestamptz edited_at
    timestamptz deleted_at
    uuid deleted_by_id FK
  }
  KUDO_RECIPIENT {
    uuid kudo_id PK,FK
    uuid user_id PK,FK
  }
  KUDO_MENTION {
    uuid kudo_id PK,FK
    uuid user_id PK,FK
  }
  REACTION {
    uuid kudo_id PK,FK
    uuid user_id PK,FK
    text emoji PK
    timestamptz created_at
  }
  COMMENT {
    uuid id PK
    uuid kudo_id FK
    uuid author_id FK
    text body
    timestamptz created_at
    timestamptz edited_at
    timestamptz deleted_at
    uuid deleted_by_id FK
  }
  NOTIFICATION {
    uuid id PK
    uuid user_id FK
    enum kind "kudo_received | comment | mention | reaction"
    uuid kudo_id FK
    uuid comment_id FK
    uuid actor_id FK
    timestamptz created_at
    timestamptz read_at
  }
```

A separate infrastructure table, `outbox_events`, holds `id`, `type`, `payload jsonb`, `created_at` and `processed_at`. pg-boss also keeps its own tables in a `pgboss` schema.

## Invariants

Enforced by the **database**:

- Unique: user email (case-insensitive), user handle, value name (case-insensitive); reactions on `(kudo_id, user_id, emoji)`.
- `kudos.body_text` is 1–500 characters, `comments.body` 1–1000, `users.bio` ≤ 280.
- Deleting a kudo row cascades to its recipients, mentions, reactions, comments and notifications. In practice kudos are only ever soft-deleted.

Enforced by the **API** (they span rows, so they live in the domain layer, with tests):

- `sender_id` must not appear in that kudo's `kudo_recipients` (no self-kudos).
- Each kudo has between 1 and 10 recipients.
- A kudo can only be created with a value that is **not archived**.
- Soft-deleted kudos (`deleted_at IS NOT NULL`) are excluded from feeds, profiles, leaderboards and notifications; admins see them in the audit view.
- Deactivated users (`deactivated_at` set) can't sign in, and API tokens for them are ignored. Their content stays visible, shown as "Former employee" to non-admins.

## Indexes

- `kudos (created_at DESC, id DESC) WHERE deleted_at IS NULL`: feed pagination.
- `kudo_recipients (user_id, kudo_id)`: profile "Received" tab and leaderboard.
- `kudos (sender_id, created_at DESC)`: profile "Given" tab.
- `users USING gin (… gin_trgm_ops)` on name, title and team: fuzzy people search.
- `notifications (user_id, created_at DESC)` and a partial index on unread: notification list and badge.
- `outbox_events (created_at) WHERE processed_at IS NULL`: worker queue.
