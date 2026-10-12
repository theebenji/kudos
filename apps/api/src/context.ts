import { type Database, findActiveUserById, type User } from "@repo/db";
import { bearerToken, verifyApiToken } from "./auth/token";
import type { Env } from "./env";

export type Viewer = Pick<User, "id" | "role" | "name">;

export type Context = {
  db: Database;
  /** The signed-in, active user, or null. Role comes from the DB, not the token, so it's never stale. */
  viewer: Viewer | null;
};

export type ContextDeps = { db: Database; env: Pick<Env, "AUTH_JWT_SECRET"> };

export async function createContext(request: Request, deps: ContextDeps): Promise<Context> {
  const token = bearerToken(request);
  const claims = token ? await verifyApiToken(token, deps.env.AUTH_JWT_SECRET) : null;
  const user = claims ? await findActiveUserById(deps.db, claims.userId) : undefined;
  return {
    db: deps.db,
    viewer: user ? { id: user.id, role: user.role, name: user.name } : null,
  };
}
