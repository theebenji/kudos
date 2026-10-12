import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema> & { $client: pg.Pool };

export function createDb(connectionString: string, options: { max?: number } = {}): Database {
  const pool = new pg.Pool({ connectionString, max: options.max ?? 10 });
  return drizzle(pool, { schema });
}
