import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { createDb } from "@repo/db";
import { runMigrations } from "@repo/db/migrate";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

/** Starts a throwaway Postgres (same major version as docker-compose.yml) and applies the real migrations. */
export default async function setup(project: TestProject) {
  const container = await new PostgreSqlContainer("postgres:18.6-alpine").start();
  const databaseUrl = container.getConnectionUri();

  const db = createDb(databaseUrl, { max: 1 });
  await runMigrations(db);
  await db.$client.end();

  project.provide("databaseUrl", databaseUrl);
  return async () => {
    await container.stop();
  };
}
