import "server-only";
import { createDb, type Database } from "@repo/db";
import { env } from "./env";

// The web app touches the database only for auth (dev picker + just-in-time provisioning).
// Cached on globalThis so dev hot-reloads don't open a new pool each time.
const globalForDb = globalThis as unknown as { webDb?: Database };

export function db(): Database {
  globalForDb.webDb ??= createDb(env().DATABASE_URL, { max: 5 });
  return globalForDb.webDb;
}
