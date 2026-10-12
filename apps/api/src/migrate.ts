// Container entry point: apply migrations, then exit. Used by the `migrate` Compose service.
import { createDb } from "@repo/db";
import { runMigrations } from "@repo/db/migrate";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const db = createDb(url, { max: 1 });
await runMigrations(db, process.env.MIGRATIONS_DIR);
await db.$client.end();
console.log("Migrations applied.");
