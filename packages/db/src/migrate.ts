import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { Database } from "./client";

/** Default location of the generated SQL migrations inside this package. */
export const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../drizzle",
);

export async function runMigrations(db: Database, migrationsFolder = MIGRATIONS_DIR) {
  await migrate(db, { migrationsFolder });
}
