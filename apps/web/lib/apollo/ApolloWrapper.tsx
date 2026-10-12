"use client";

import { HttpLink } from "@apollo/client";
import { SetContextLink } from "@apollo/client/link/context";
import { ApolloClient, ApolloNextAppProvider } from "@apollo/client-integration-nextjs";
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
    return new ApolloClient({
      cache: createCache(),
      link: auth.concat(
        new HttpLink({
          uri: isServer ? serverApiUrl : browserApiUrl,
          fetchOptions: { cache: "no-store" },
        }),
      ),
    });
  }
  return <ApolloNextAppProvider makeClient={makeClient}>{children}</ApolloNextAppProvider>;
}
