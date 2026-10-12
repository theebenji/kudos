import "server-only";
import { auth } from "@/auth";
import { mintApiToken } from "./api-token";
import { env } from "./env";

export class ApiError extends Error {}

/**
 * Server-side GraphQL request as the signed-in user. Phase 4 replaces this with Apollo Client
 * and typed documents from GraphQL Codegen.
 */
export async function apiQuery<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const session = await auth();
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (session?.user?.id)
    headers.authorization = `Bearer ${(await mintApiToken(session.user.id)).token}`;

  const response = await fetch(env().API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  const body = (await response.json()) as { data?: T; errors?: { message: string }[] };
  if (body.errors?.length || !body.data) {
    throw new ApiError(
      body.errors?.map((e) => e.message).join("; ") ?? `API responded ${response.status}`,
    );
  }
  return body.data;
}
