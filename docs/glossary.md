---
title: Glossary
type: spec
status: accepted
tags: [domain]
created: 2026-10-11
updated: 2026-10-11
---

# Glossary

| Term                     | Meaning                                                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| **Kudo**                 | A public recognition message from one **sender** to one or more **recipients**, optionally tagged with a **value**.            |
| **Sender**               | The user who wrote the kudo. Always the signed-in user.                                                                        |
| **Recipient**            | A user being recognized by a kudo. Chosen explicitly; between 1 and 10 per kudo; never the sender.                             |
| **Mention**              | An `@person` reference inside a kudo body. It notifies that person but does **not** make them a recipient.                     |
| **Value**                | A company value or category (e.g. "Teamwork") that a kudo can be tagged with. Managed by admins; archived rather than deleted. |
| **Reaction**             | An emoji added to a kudo by a user. Each user can add each emoji once per kudo.                                                |
| **Comment**              | A flat, plain-text (plus emoji) reply on a kudo.                                                                               |
| **Feed**                 | The global, newest-first list of kudos on the home page.                                                                       |
| **Profile**              | A user's page, with **Received** and **Given** tabs.                                                                           |
| **Handle**               | The URL-safe identifier for a user, taken from the local part of their email (`/people/ana.lopez`).                            |
| **Leaderboard**          | Top 10 **recognized** (received) and top 10 **recognizers** (given), filtered by value and time window.                        |
| **Member / Admin**       | The two roles. Admins manage values and users and handle moderation.                                                           |
| **Soft delete**          | Setting `deleted_at` on a row: the item is hidden from everyone except admins in the audit view.                               |
| **Deactivated user**     | A user who can no longer sign in. Their content remains, attributed to "Former employee".                                      |
| **Outbox event**         | A row written in the same transaction as a domain change, which the worker later turns into notifications.                     |
| **Notification channel** | A way of delivering notifications (`InAppChannel` today, `EmailChannel` later).                                                |
| **Auth bridge**          | The short-lived JWT the Next.js server mints so the API can trust who the user is.                                             |
| **Swap point**           | An interface with a demo implementation that can be replaced by a production one (PubSub, FileStorage, …).                     |
