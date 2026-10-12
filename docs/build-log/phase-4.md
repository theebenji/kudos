---
title: "Phase 4: Feed, composer, profiles"
type: note
status: accepted
tags: [build-log]
created: 2026-10-11
updated: 2026-10-11
---

# Phase 4: Feed, composer, profiles

## Built

- **`@repo/rich-text`** (new package):
  - the document types
  - `toPlainText` / `extractMentionIds`
  - the server **validator** (node allowlist, attribute stripping, link and GIF source rules, size limits)
  - the GIF source allowlist and the generated `BUNDLED_GIFS` manifest
- **20 original demo GIFs:** canvas scenes rendered in headless Chromium and encoded with gifenc, about 130 KB each. They're served from `/gifs/`, and about 15% of seeded kudos use them.
- **API:**
  - The `Kudo` type: sender, recipients (batched), value, body, `isEdited`, `viewerCanEdit` / `viewerCanDelete`.
  - Feed: `kudos(filter: { valueId, department, team, involvingMe })` with keyset cursors on `(created_at, id)`.
  - `kudo(id)`.
  - On `User`: `kudosReceived` / `kudosGiven` connections and their counts.
  - Mutations, built on a domain module that encodes the SPEC §1.1 rules:
    - `createKudo`: no self-kudos, 1–10 active recipients, non-archived value, active mentions, rate limit of 30/hour, outbox event
    - `updateKudo`: sender only, marks edited, emits newly added mentions
    - `deleteKudo`: soft delete, by the sender or an admin
  - `searchPeople`: substring + trigram matching, excludes the viewer and former employees.
  - `departments` / `teams`.
  - `gifs`: a `GifProvider` with bundled and GIPHY implementations; GIPHY is proxied, capped at PG-13, with a timeout.
- **Web:**
  - Apollo with the Next integration, a shared cache with relay pagination, and Codegen typed documents ([ADR-0012](../adr/0012-apollo-ssr-data-fetching.md)).
  - An `(app)` route group: the shell (header, account menu, skip link), feed with filters and infinite loading, kudo permalink, profiles with Received/Given tabs and counts, and the mention resolver `/people/id/[id]`.
  - The composer: one dialog for the whole app. Create or edit, people picker, value select, rich-text editor, field-level errors mapped from the API, and a screen-reader announcement on send.
  - Delete with confirmation, evicting the kudo from every cached list.
- **UI library:**
  - `MultiCombobox`, built in-house as agreed
  - the `useListNavigation` hook
  - `SelectField`, `CheckboxField`
  - `RichTextEditor`: Tiptap limited to the allowlist, Radix Toolbar, @mentions, link, emoji, GIF
  - `EmojiPicker`, `GifPicker`
  - the `useNow` hydration-safe clock

## Verified

- **Tests:**
  - API 39, including 20 new kudo rule and feed tests on a real Postgres
  - rich-text 22
  - web 10
  - UI unit 65
  - **150 story tests** (75 stories × light/dark, with axe)
- **Feed queries don't grow with the page:** 20 kudos with senders, recipients, managers, values and counts take **7 SQL queries**.
- **A scripted end-to-end flow in headless Chromium**, run against the dev servers _and_ the production Docker images, with the browser in a different timezone from the server:
  1. sign in as Morgan
  2. filter the feed
  3. compose with the keyboard: recipient, value, @mention, emoji
  4. send, and confirm the announcement
  5. edit
  6. check the recipient's profile counts
  7. follow the mention link
  8. delete from the permalink page
  9. switch to dark mode

  It finished with **no browser errors**.

## Bugs found by end-to-end testing (all fixed, most with regression stories)

1. **The feed filters lagged.** Controlled inputs were updated inside a transition that waited for the query, so a checkbox didn't toggle until results arrived. Fixed with `useDeferredValue` on the query input.
2. **The combobox listbox stayed open** after a pick and covered the form. It now opens only on typing or ↓, and closes on blur and after each pick.
3. **Popovers opened inside the dialog rendered behind it**, because of the z-index token order. Tokens were re-layered, with a regression story.
4. **A fast Enter in @mentions inserted a line break** instead of the mention, while results were still loading. Fixed with `defaultIndex` state, Enter swallowed while the popup is open, and a "Searching…" state.
5. **Escape in the mention list closed the whole dialog.** Fixed with a window capture listener plus `exitSuggestion`.
6. **The auth proxy redirected `/gifs/*`**, so static GIFs went through sign-in. They're now excluded from the matcher.
7. **Hydration mismatch in production** (React #418), because relative times differ between server (UTC) and browser timezones. Fixed with `useNow()` (`useSyncExternalStore` with a null server snapshot).
8. **axe:** `aria-expanded` isn't allowed on `role="textbox"`, so the editor's ARIA was corrected.
9. **Lint (react-hooks v7):** setState in effect bodies and ref writes during render were refactored (derived loading state; layout-effect "latest refs").

## Decisions made mid-flight

- [ADR-0012](../adr/0012-apollo-ssr-data-fetching.md): Apollo in server-rendered client components, with a token handoff and runtime API URLs.
- [ADR-0007](../adr/0007-rich-text-tiptap.md) amended: emoji are Unicode text; the hardBreak node; the validator lives in `@repo/rich-text`; original bundled GIFs.
- [ADR-0008](../adr/0008-css-modules-radix.md) amended: combobox details, Escape layering, the z-index scale, the editor's ARIA.
- [ADR-0006](../adr/0006-outbox-notifications.md) amended: the outbox event types are already written.
- Recipients can't be changed when editing a kudo; only the message and value can.
- Stylelint allows CSS Modules' `:global()` and PascalCase third-party class names (for styling Tiptap).

## Deviations from the spec

- **Avatar upload and bio editing (`/settings/profile`) are moved to Phase 6**, alongside the admin pages, since they need the `FileStorage` (S3) work.
- **The people directory page (`/people`) is still Phase 6.** People search already exists for the picker and mentions.

## Next

- **Phase 5:** reactions (the ReactionBar is already built), comments, the notification worker (pg-boss draining the outbox), in-app notifications with realtime subscriptions, and the notification bell.
