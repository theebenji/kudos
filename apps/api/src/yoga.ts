import { EnvelopArmor } from "@escape.tech/graphql-armor";
import type { GraphQLArmorCallbackConfiguration } from "@escape.tech/graphql-armor-types";
import { useDisableIntrospection } from "@graphql-yoga/plugin-disable-introspection";
import { createYoga } from "graphql-yoga";
import { type ContextDeps, createContext } from "./context";
import type { Env } from "./env";
import { schema } from "./schema";

export type AppDeps = ContextDeps & { env: Env };

export function createApp({ db, env }: AppDeps) {
  const production = env.NODE_ENV === "production";
  // Query-shape limits against abusive operations (SPEC §2.3).
  // Report violations as ordinary validation errors (HTTP 400 with a clear message). Armor's
  // default is to throw mid-validation, which Yoga masks as a 500 "Unexpected error".
  const report: GraphQLArmorCallbackConfiguration = {
    propagateOnRejection: false,
    onReject: [(context, error) => context?.reportError(error)],
  };
  const armor = new EnvelopArmor({
    maxDepth: { n: 10, ...report },
    maxAliases: { n: 15, ...report },
    maxDirectives: { n: 25, ...report },
    maxTokens: { n: 2000, ...report },
    costLimit: { maxCost: 5000, ...report },
    blockFieldSuggestion: { enabled: production },
  });

  return createYoga({
    schema,
    context: ({ request }) => createContext(request, { db, env }),
    graphqlEndpoint: "/graphql",
    cors: { origin: env.WEB_ORIGIN, credentials: true },
    graphiql: !production,
    landingPage: false,
    plugins: [...armor.protect().plugins, ...(production ? [useDisableIntrospection()] : [])],
  });
}
