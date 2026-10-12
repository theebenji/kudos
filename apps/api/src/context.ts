import { type Database, findActiveUserById, type User } from "@repo/db";
import { bearerToken, verifyApiToken } from "./auth/token";
import type { Env } from "./env";
import type { GifProvider } from "./gifs/provider";
import type { PubSub } from "./realtime/pubsub";

export type Viewer = Pick<User, "id" | "role" | "name">;

export type Context = {
  db: Database;
  gifs: GifProvider;
  pubsub: PubSub;
  /** The signed-in, active user, or null. Role comes from the DB, not the token, so it's never stale. */
  viewer: Viewer | null;
};

export type ContextDeps = {
  db: Database;
  gifs: GifProvider;
  pubsub: PubSub;
  env: Pick<Env, "AUTH_JWT_SECRET">;
};

/**
 * HTTP requests carry the token in `Authorization: Bearer …`; WebSocket subscriptions send it as
 * `connectionParams.authorization` when connecting (ADR-0005).
 */
export async function createContext(
  { request, connectionParams }: { request?: Request; connectionParams?: Record<string, unknown> },
  deps: ContextDeps,
): Promise<Context> {
  const fromParams =
    typeof connectionParams?.authorization === "string"
      ? connectionParams.authorization.replace(/^Bearer\s+/i, "")
      : null;
  const token = fromParams ?? (request ? bearerToken(request) : null);
  const claims = token ? await verifyApiToken(token, deps.env.AUTH_JWT_SECRET) : null;
  const user = claims ? await findActiveUserById(deps.db, claims.userId) : undefined;
  return {
    db: deps.db,
    gifs: deps.gifs,
    pubsub: deps.pubsub,
    viewer: user ? { id: user.id, role: user.role, name: user.name } : null,
  };
}
