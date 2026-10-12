import { createDb, type Database, type NewUser, type User, users, values } from "@repo/db";
import { sql } from "drizzle-orm";
import { SignJWT } from "jose";
import { afterAll, beforeEach, inject } from "vitest";
import { API_TOKEN_AUDIENCE, API_TOKEN_ISSUER } from "../src/auth/token";
import { type Env, loadEnv } from "../src/env";
import { createApp } from "../src/yoga";

export const TEST_JWT_SECRET = "test-only-jwt-secret-at-least-32-characters";

/** A database, a Yoga app over it, and a clean slate before every test in the file. */
export function setupTestApi(envOverrides: Partial<Record<keyof Env, string>> = {}) {
  const env = loadEnv({
    NODE_ENV: "test",
    DATABASE_URL: inject("databaseUrl"),
    AUTH_JWT_SECRET: TEST_JWT_SECRET,
    ...envOverrides,
  });
  const db = createDb(env.DATABASE_URL, { max: 2 });
  const app = createApp({ db, env });

  beforeEach(() => resetDb(db));
  afterAll(() => db.$client.end());

  async function gql<T = Record<string, unknown>>(
    query: string,
    options: { variables?: Record<string, unknown>; token?: string } = {},
  ): Promise<{ data?: T; errors?: { message: string }[]; status: number }> {
    const response = await app.fetch("http://test/graphql", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(options.token && { authorization: `Bearer ${options.token}` }),
      },
      body: JSON.stringify({ query, variables: options.variables }),
    });
    return { ...((await response.json()) as object), status: response.status };
  }

  return { db, app, env, gql };
}

export async function resetDb(db: Database) {
  await db.execute(sql`
    truncate table notifications, comments, reactions, kudo_mentions, kudo_recipients,
      kudos, outbox_events, values, users restart identity cascade
  `);
}

let userSeq = 0;
export async function insertUser(db: Database, overrides: Partial<NewUser> = {}): Promise<User> {
  userSeq += 1;
  const handle = overrides.handle ?? `user${userSeq}`;
  const [user] = await db
    .insert(users)
    .values({ name: `User ${userSeq}`, email: `${handle}@example.com`, handle, ...overrides })
    .returning();
  if (!user) throw new Error("insertUser failed");
  return user;
}

export async function insertValue(
  db: Database,
  name: string,
  overrides: { archived?: boolean; sortOrder?: number } = {},
) {
  const [value] = await db
    .insert(values)
    .values({
      name,
      sortOrder: overrides.sortOrder ?? 0,
      archivedAt: overrides.archived ? new Date() : null,
    })
    .returning();
  if (!value) throw new Error("insertValue failed");
  return value;
}

/** Signs a token exactly like apps/web does; options let tests forge bad ones. */
export async function signToken(
  userId: string,
  options: { secret?: string; expiresIn?: string; issuer?: string; audience?: string } = {},
) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(options.issuer ?? API_TOKEN_ISSUER)
    .setAudience(options.audience ?? API_TOKEN_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(options.expiresIn ?? "5m")
    .sign(new TextEncoder().encode(options.secret ?? TEST_JWT_SECRET));
}
