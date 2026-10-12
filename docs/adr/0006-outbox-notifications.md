---
title: "ADR-0006: Outbox + pg-boss notification pipeline"
type: adr
status: accepted
tags: [adr, notifications, architecture]
created: 2026-10-11
updated: 2026-10-11
supersedes:
superseded-by:
---

# ADR-0006: Outbox + pg-boss notification pipeline

## Context

v1 notifications are in-app and realtime. Email (and later possibly Slack) must be easy to add. Notifications must never be lost or sent twice because a write half-failed.

## Decision

- Every domain write that should notify someone inserts an **`outbox_event`** row (`kudo.created`, `kudo.reacted`, `comment.created`, `mention.created`, …) **in the same transaction**.
- A **pg-boss** worker claims the events and works out who should be notified.
- It calls each registered **`NotificationChannel`**. Today that's only `InAppChannel`, which inserts `notification` rows and publishes to `PubSub`, and `PubSub` feeds the GraphQL subscription.
- Reactions create notification rows **without** a realtime toast.
- `PubSub` is in-memory by default and **Redis** when an env var is set. Redis is required before running more than one API or worker instance.

## Consequences

- Adding email means writing `EmailChannel` plus per-user preferences, with no changes to the resolvers.
- pg-boss uses Postgres, so there's no new infrastructure.
- Delivery is eventually consistent, within about a second.

## Amendment (Phase 4, 2026-10-11)

The kudo mutations already write outbox events, which Phase 5's worker will consume:

- `kudo.created` with `{ kudoId, senderId, recipientIds, mentionIds }`
- `kudo.mentions_added` with `{ kudoId, senderId, mentionIds, recipientIds }`, written on edit and containing only the newly mentioned people
