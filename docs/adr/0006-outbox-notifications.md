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

## Amendment (Phase 5, 2026-10-11)

What changed during implementation, and why:

- **No pg-boss.** The outbox table already is a durable queue. The worker claims one event at a time with `SELECT … FOR UPDATE SKIP LOCKED`, handles it in its own transaction, and marks it processed. Failures increment `attempts` and record `last_error`, and an event is retried until `MAX_ATTEMPTS` (5). That gives safe concurrency, isolation of bad events, and no extra dependency. Revisit pg-boss if scheduled jobs are needed, such as refreshing leaderboard views.
- **Pub/sub defaults to Postgres `LISTEN/NOTIFY`, not in-memory.** The worker and the API are separate processes, so an in-memory pub/sub can't carry the worker's events to the API's WebSocket subscribers. `PgEventTarget` plugs Postgres into Yoga's `createPubSub`. Payloads carry ids only (Postgres caps NOTIFY at 8 kB). Redis stays the option for scaling out.
- **The worker is woken by `NOTIFY kudos_outbox`** after each mutation that writes outbox events, with a 5-second polling fallback. Measured latency from send to toast: 26 ms in dev and 78 ms across Docker containers. Before the kudo mutations sent the wake-up, it was about 3.3 s, which is how that gap was found.
- **Realtime events are published only after the transaction commits.**
- **Reaction batching:** a partial unique index on `(user_id, kudo_id) WHERE kind = 'reaction' AND read_at IS NULL` lets new reactions update the unread notification (`count + 1`, latest actor) instead of adding rows. Once it's read, the next reaction starts a new one.
- **Audiences:**
  - new kudo → recipients, plus mentioned non-recipients
  - comment → the kudo's sender and recipients, minus the commenter
  - reaction → the kudo's sender and recipients, minus the reactor
  - Deactivated users and deleted kudos are skipped.
- **Subscription auth is checked at subscribe time.** Pothos scope auth runs per resolved event, so without this check an anonymous socket could idle on a topic.
- **Dev convenience:** `pnpm --filter @repo/api dev` runs the API and worker in one watched process (`src/dev.ts`). Docker runs them as separate services.
