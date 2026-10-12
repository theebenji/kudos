---
title: Local setup
type: guide
status: accepted
tags: [guide, setup]
created: 2026-10-11
updated: 2026-10-11
---

# Local setup

## Prerequisites

- **Node 24+** (see `.nvmrc`).
- **pnpm 12**, enabled via Corepack: `corepack enable pnpm`. The exact version is pinned in the root `package.json` (`packageManager`).
- **Docker** (Docker Desktop or OrbStack) for Postgres, S3 storage and, from Phase 2, the integration tests.

## First run

```bash
pnpm install
cp .env.example .env                                       # dev defaults; every app reads this root file
pnpm --filter @repo/ui exec playwright install chromium   # browser for Storybook tests
pnpm infra:up                                              # Postgres :5432, S3 storage :8333
pnpm db:migrate && pnpm db:seed                            # schema + deterministic demo org
pnpm dev                                                   # web :3000, API :4000/graphql
```

Open http://localhost:3000 and pick someone from the **demo sign-in list**. **Avery Admin** (admin) and **Morgan Member** (member) are always at the top. The seed resets all data each time it runs, and refuses to run when `NODE_ENV=production`.

If `docker` isn't found right after installing Docker Desktop, open a new terminal, or add `~/.docker/bin` to your `PATH`.

## Everyday commands

| Command                                      | What it does                                                                              |
| -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `pnpm dev`                                   | Run every app in watch mode                                                               |
| `pnpm storybook`                             | Storybook at http://localhost:6006                                                        |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | Checks across all packages (cached by Turborepo)                                          |
| `pnpm test:storybook`                        | Run every story in headless Chromium, including axe a11y                                  |
| `pnpm build`                                 | Production builds (Next standalone, API, Storybook)                                       |
| `pnpm format`                                | Prettier                                                                                  |
| `pnpm docs:sync`                             | Copy `docs/` into the Obsidian vault                                                      |
| `pnpm db:generate`                           | Generate a SQL migration after editing `packages/db/src/schema.ts`                        |
| `pnpm db:migrate` / `pnpm db:seed`           | Apply migrations / reset the demo data                                                    |
| `pnpm db:studio`                             | Drizzle Studio (browse the database)                                                      |
| `pnpm schema:print`                          | Regenerate `apps/api/schema.graphql` after schema changes (a test fails if it's stale)    |
| `pnpm --filter @repo/web codegen`            | Regenerate typed GraphQL documents (`apps/web/gql/`) after changing queries or the schema |
| `pnpm --filter @repo/web gifs:generate`      | Regenerate the bundled demo GIFs and their manifest                                       |
| `docker compose --profile app up -d --build` | Also run migrations, the API and web app in containers                                    |

## Ports

| Service                | Port |
| ---------------------- | ---- |
| Web (Next.js)          | 3000 |
| API (GraphQL Yoga)     | 4000 |
| Storybook              | 6006 |
| Postgres               | 5432 |
| S3 storage (SeaweedFS) | 8333 |

## Chromatic

1. Create a project at chromatic.com, linked to the GitHub repo.
2. Add its token as the GitHub Actions secret `CHROMATIC_PROJECT_TOKEN`. CI skips the Chromatic job with a notice until the secret exists.
3. To run it locally: `CHROMATIC_PROJECT_TOKEN=… pnpm --filter @repo/ui chromatic`.

## GIF search

Without `GIPHY_API_KEY`, the composer's GIF picker searches the 20 bundled demo GIFs, and says so. To use GIPHY, put a key in `.env` (`GIPHY_API_KEY=…`) and restart the API. Results are proxied through the API, with a PG-13 content rating.

## Notes

- The API tests start their own throwaway Postgres via **Testcontainers**, so Docker must be running for `pnpm test`.
- pnpm 12 only runs dependency install scripts for packages listed under `allowBuilds` in `pnpm-workspace.yaml`. If a new dependency needs one, approve it with `pnpm approve-builds <pkg>`.
- pnpm 12 also refuses package versions published too recently (a supply-chain safeguard). Don't add `minimumReleaseAgeExclude` entries; wait, or pick the previous version.
