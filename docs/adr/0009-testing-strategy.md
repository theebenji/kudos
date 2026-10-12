---
title: "ADR-0009: Layered testing strategy"
type: adr
status: accepted
tags: [adr, testing, quality]
created: 2026-10-11
updated: 2026-10-11
supersedes:
superseded-by:
---

# ADR-0009: Layered testing strategy

## Context

Without a clear split, the same behavior gets tested three times and gaps appear between the layers.

## Decision

| Layer           | Tool                                                                 | Owns                                                           |
| --------------- | -------------------------------------------------------------------- | -------------------------------------------------------------- |
| Unit            | Vitest                                                               | Pure domain logic, validators, utilities                       |
| App components  | Vitest + **React Testing Library** (jsdom) + Apollo `MockedProvider` | `apps/web` feature components and hooks                        |
| UI components   | Storybook interaction tests + axe (test runner in CI)                | `packages/ui` behavior and accessibility                       |
| Visual          | **Chromatic** with TurboSnap                                         | Snapshots of every story on PRs; hosts the published Storybook |
| API integration | Vitest + Testcontainers Postgres                                     | GraphQL operations against a real DB                           |
| E2E             | Playwright (+ axe)                                                   | The critical user journeys                                     |

## Consequences

- Tests are not shared between layers: if a story covers a `packages/ui` behavior, it gets no React Testing Library test as well.
- Chromatic needs a project token in a CI secret (`CHROMATIC_PROJECT_TOKEN`).
- Testcontainers needs Docker wherever tests run.
