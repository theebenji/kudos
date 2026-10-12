import { createDb } from "./client";
import { runMigrations } from "./migrate";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const db = createDb(url, { max: 1 });
await runMigrations(db);
await db.$client.end();
console.log("Migrations applied.");
