import { and, asc, desc, eq, isNull, like, sql } from "drizzle-orm";
import type { Database } from "../client";
import { type User, users } from "../schema";

// Queries the web app's auth layer needs (dev sign-in picker and just-in-time provisioning).
// Everything else goes through the GraphQL API.

export async function findActiveUserById(db: Database, id: string): Promise<User | undefined> {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, id), isNull(users.deactivatedAt)));
  return user;
}

export async function findUserByEmail(db: Database, email: string): Promise<User | undefined> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(sql`lower(${users.email})`, email.toLowerCase()));
  return user;
}

export async function listActiveUsers(db: Database) {
  return db
    .select({ id: users.id, name: users.name, title: users.title, role: users.role })
    .from(users)
    .where(isNull(users.deactivatedAt))
    .orderBy(desc(users.role), asc(users.name));
}

/** The email's local part, lowercased and made URL-safe. */
export function handleBaseFromEmail(email: string): string {
  const local = (email.split("@")[0] ?? "").toLowerCase();
  return local.replace(/[^a-z0-9._-]/g, "-").replace(/^[-._]+|[-._]+$/g, "") || "user";
}

/** A handle not yet taken: `ana.lopez`, then `ana.lopez-2`, `ana.lopez-3`, … */
export async function uniqueHandleFor(db: Database, email: string): Promise<string> {
  const base = handleBaseFromEmail(email);
  const rows = await db
    .select({ handle: users.handle })
    .from(users)
    .where(like(users.handle, `${base}%`));
  const taken = new Set(rows.map((row) => row.handle));
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}

/** Just-in-time provisioning on first SSO sign-in. Directory fields are filled later by a UserDirectorySource. */
export async function provisionUser(
  db: Database,
  input: { email: string; name: string },
): Promise<User> {
  const handle = await uniqueHandleFor(db, input.email);
  const [user] = await db
    .insert(users)
    .values({ email: input.email, name: input.name, handle })
    .returning();
  if (!user) throw new Error("Failed to provision user");
  return user;
}
