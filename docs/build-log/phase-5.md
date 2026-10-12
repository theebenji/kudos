---
title: "Phase 5: Reactions, comments, notifications"
type: note
status: accepted
tags: [build-log]
created: 2026-10-11
updated: 2026-10-11
---

# Phase 5: Reactions, comments, notifications

## Built

- **Repository:** published to GitHub at `theebenji/kudos` (public). Commits use the GitHub noreply address, and the history was rewritten before the first push. CI passed on GitHub on the first run.
- **Database:** migration `0002`:
  - `notifications.count`, plus a partial unique index for batching unread reaction notifications
  - `outbox_events.attempts` and `last_error` for retries
- **API:**
  - **Reactions:** `toggleReaction`, which accepts any single emoji (grapheme-aware, including skin tones, ZWJ sequences and flags). `Kudo.reactions` gives a per-emoji count, `reactedByViewer`, and up to 5 names with the viewer shown first as "You".
  - **Comments:** `addComment`, `updateComment` (author only), `deleteComment` (author or admin, soft delete), `Kudo.commentCount`, and `Kudo.comments` (oldest first).
  - **Notifications:**
    - `notifications` (newest first), `unreadNotificationCount`, `markNotificationsRead(ids?)`
    - the **`notificationAdded` subscription** over graphql-ws on `/graphql`, which goes through Yoga's envelop pipeline and authenticates via `connectionParams`
  - **The worker** (`dist/worker.js`, plus the Compose `worker` service):
    - drains the outbox with `SKIP LOCKED`, one transaction per event, retrying up to 5 times
    - decides who hears about each event, through a `NotificationChannel` interface whose in-app channel batches reactions
    - publishes realtime events only after commit
  - **`PgEventTarget`:** Postgres LISTEN/NOTIFY behind Yoga's `createPubSub`, so the worker and API processes share events with no new infrastructure.
- **UI library:**
  - `ToastProvider` / `useToast`, polite by default
  - `RelativeTime`, extracted from KudoCard and reused
  - `"use client"` on every hook-using module, so server components can import the library
- **Web:**
  - Reactions with optimistic toggles and an emoji picker; picking an emoji you've already used doesn't remove it.
  - An expandable comment thread: post (Cmd/Ctrl+Enter), edit inline, delete with confirmation. It opens by default on the permalink page.
  - Apollo split link: subscriptions go over graphql-ws, with a fresh token on each reconnect.
  - A header bell with a live unread count, and toasts for new notifications (reactions don't toast).
  - `/notifications`: unread state, "Mark all as read", and opening an item marks it read and goes to the kudo.

## Verified

- **Tests:**
  - **API 86**, including:
    - 25 new reaction, comment, fan-out, batching, retry and subscription tests on a real Postgres
    - a real WebSocket subscription receiving a notification the worker published through Postgres, plus an anonymous subscription being refused immediately
    - **25 checks that run every web operation through the API's validation and query limits**
  - **web 20**
  - **UI unit 65, plus all story tests in both themes**
- **A two-person realtime flow in headless Chromium**, against the dev servers and against the **production containers** (API and worker as separate processes, browser in a different timezone):
  1. Avery watches the feed while Morgan sends her a kudo; a **live toast appears in 26 ms (dev) / 78 ms (Docker)**, and the bell shows "1 unread".
  2. Avery reacts and comments from the toast's "View" link.
  3. Morgan gets a live comment toast; the reaction stays silent and batched.
  4. Morgan's notifications page lists both; "Mark all as read" clears the bell.

  It finished with **no browser errors**. The phase 4 flow still passes.

## Bugs found and fixed

1. **Anonymous subscriptions weren't refused.** Pothos scope auth runs per resolved event, so an unauthenticated socket could idle on a topic. Fixed with an explicit check at subscribe time, plus a test.
2. **A real query exceeded the API's cost limit.** `KudoComments` scored about 8.5k against a limit of 5000 that was guessed. Raised to 15000 from measurements, and `test/operations.test.ts` now validates every web operation against the real limits (it fails at the old limit — checked).
3. **Live notifications took about 3.3 s.** The kudo mutations didn't wake the worker, so delivery waited for the polling fallback. Now 26–78 ms.
4. **Toasts were announced assertively**, Radix's default, which interrupts screen readers. Background notifications are now polite, with a story test.
5. **Two buttons were both named "Comment"** (the thread toggle and submit). Submit is now "Post comment".
6. **The UI library broke server components** once `ToastProvider` was imported in a server layout. Hook-using modules now declare `"use client"`.

## Decisions made mid-flight

- [ADR-0006](../adr/0006-outbox-notifications.md) amended:
  - **No pg-boss**: the outbox with `SKIP LOCKED` is the queue.
  - **Postgres LISTEN/NOTIFY is the default pub/sub** (needed across processes); Redis is for scaling out.
  - Batching, the audiences, and subscribe-time auth are documented there.
- **Codegen `nonOptionalTypename`.** Apollo always adds `__typename`, so it's now typed as present, which optimistic responses need.
- **In the people picker, Enter picks only the highlighted person**, per the ARIA pattern. There's no auto-select.

## Next

- **Phase 6:**
  - the people directory with search
  - the leaderboard
  - admin pages: values, users and roles, the audit view
  - profile settings: avatar upload via `FileStorage`/S3, and bio
