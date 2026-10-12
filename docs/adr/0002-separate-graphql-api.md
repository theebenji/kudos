---
title: "ADR-0002: Separate GraphQL API service"
type: adr
status: accepted
tags: [adr, api, architecture]
created: 2026-10-11
updated: 2026-10-11
supersedes:
superseded-by:
---

# ADR-0002: Separate GraphQL API service

## Context

The frontend is Next.js, and GraphQL could live inside a Next route handler. However, the product needs realtime subscriptions, a background worker, and possible future clients such as Slack bots or mobile.

## Decision

The GraphQL API is its own Node service, `apps/api`, running **GraphQL Yoga**. Next.js is purely a client of it, through Apollo in both server and client components. The pg-boss worker shares the API's code, with its own entry point.

## Alternatives considered

- **Yoga mounted inside a Next.js route handler**: one fewer thing to deploy, but websockets don't fit serverless and it mixes concerns.

## Consequences

- Long-lived websocket connections for `graphql-ws` are easy to run.
- Other clients can use the API.
- There are two services to run. Docker Compose handles this locally.
- Auth has to cross a service boundary (see [ADR-0005](0005-auth-bridge.md)).
