import "server-only";
import type { TypedDocumentNode } from "@graphql-typed-document-node/core";
import { print } from "graphql";
import { auth } from "@/auth";
import { type ApiToken, mintApiToken } from "./api-token";
import { env } from "./env";

export class ApiError extends Error {}

/** A token for the signed-in user, or null. Minted per request (5-minute lifetime). */
export async function currentApiToken(): Promise<ApiToken | null> {
  const session = await auth();
  return session?.user?.id ? mintApiToken(session.user.id) : null;
}

/** Server-side GraphQL request as the signed-in user (for server components, e.g. the shell). */
export async function apiQuery<TData, TVariables extends Record<string, unknown>>(
  document: TypedDocumentNode<TData, TVariables>,
  variables?: TVariables,
): Promise<TData> {
  const token = await currentApiToken();
  const response = await fetch(env().API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token && { authorization: `Bearer ${token.token}` }),
    },
    body: JSON.stringify({ query: print(document), variables }),
    cache: "no-store",
  });
  const body = (await response.json()) as { data?: TData; errors?: { message: string }[] };
  if (body.errors?.length || !body.data) {
    throw new ApiError(
      body.errors?.map((e) => e.message).join("; ") ?? `API responded ${response.status}`,
    );
  }
  return body.data;
}
