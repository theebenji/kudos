"use client";

import { HttpLink, split } from "@apollo/client";
import { SetContextLink } from "@apollo/client/link/context";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { getMainDefinition } from "@apollo/client/utilities";
import { ApolloClient, ApolloNextAppProvider } from "@apollo/client-integration-nextjs";
import { createClient } from "graphql-ws";
import type { ReactNode } from "react";
import { createCache } from "./cache";
import { type ApiToken, createTokenSource } from "./token";

type Props = {
  /** Absolute API URL for SSR (inside Docker: the internal hostname). */
  serverApiUrl: string;
  /** Absolute API URL the browser calls. */
  browserApiUrl: string;
  /** Token minted by the server for this request. */
  initialToken: ApiToken | null;
  children: ReactNode;
};

export function ApolloWrapper({ serverApiUrl, browserApiUrl, initialToken, children }: Props) {
  function makeClient() {
    const isServer = typeof window === "undefined";
    const getToken = isServer
      ? async () => initialToken?.token ?? null
      : createTokenSource(initialToken);
    const auth = new SetContextLink(async (prevContext) => {
      const token = await getToken();
      return {
        headers: { ...prevContext.headers, ...(token && { authorization: `Bearer ${token}` }) },
      };
    });
    const http = auth.concat(
      new HttpLink({
        uri: isServer ? serverApiUrl : browserApiUrl,
        fetchOptions: { cache: "no-store" },
      }),
    );
    if (isServer) return new ApolloClient({ cache: createCache(), link: http });

    // Subscriptions (live notifications) go over graphql-ws; a fresh token is sent on each (re)connect.
    const ws = new GraphQLWsLink(
      createClient({
        url: browserApiUrl.replace(/^http/, "ws"),
        lazy: true,
        retryAttempts: Number.POSITIVE_INFINITY,
        connectionParams: async () => {
          const token = await getToken();
          return token ? { authorization: `Bearer ${token}` } : {};
        },
      }),
    );
    const link = split(
      ({ query }) => {
        const definition = getMainDefinition(query);
        return definition.kind === "OperationDefinition" && definition.operation === "subscription";
      },
      ws,
      http,
    );
    return new ApolloClient({ cache: createCache(), link });
  }
  return <ApolloNextAppProvider makeClient={makeClient}>{children}</ApolloNextAppProvider>;
}
