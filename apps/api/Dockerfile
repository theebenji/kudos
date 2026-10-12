# Build from the repo root: docker build -f apps/api/Dockerfile .
FROM node:24-alpine AS base
RUN corepack enable pnpm

FROM base AS prune
WORKDIR /repo
COPY . .
RUN pnpm dlx turbo@2.11.7 prune @repo/api --docker

FROM base AS build
WORKDIR /repo
COPY --from=prune /repo/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=prune /repo/out/full/ .
RUN pnpm turbo run build --filter=@repo/api \
  && pnpm --filter @repo/api deploy --prod /prod/api

FROM node:24-alpine AS run
WORKDIR /app
ENV NODE_ENV=production API_PORT=4000 MIGRATIONS_DIR=/app/drizzle
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /prod/api/package.json ./
COPY --from=build --chown=app:app /prod/api/node_modules ./node_modules
COPY --from=build --chown=app:app /prod/api/dist ./dist
# SQL migrations from @repo/db, applied by `node dist/migrate.js` (the Compose "migrate" service).
COPY --from=build --chown=app:app /repo/packages/db/drizzle ./drizzle
USER app
EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=3s CMD wget -qO- --header='content-type: application/json' --post-data='{"query":"{ health }"}' http://127.0.0.1:4000/graphql || exit 1
CMD ["node", "dist/index.js"]
