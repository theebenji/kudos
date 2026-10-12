import SchemaBuilder from "@pothos/core";
import DataloaderPlugin from "@pothos/plugin-dataloader";
import ErrorsPlugin from "@pothos/plugin-errors";
import RelayPlugin from "@pothos/plugin-relay";
import ScopeAuthPlugin from "@pothos/plugin-scope-auth";
import type { Context } from "../context";

const upperFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const builder = new SchemaBuilder<{
  Context: Context;
  AuthScopes: { member: boolean; admin: boolean };
  Scalars: {
    DateTime: { Input: Date; Output: Date };
    Date: { Input: string; Output: string };
    JSON: { Input: unknown; Output: unknown };
  };
  DefaultFieldNullability: false;
  DefaultEdgesNullability: false;
  DefaultNodeNullability: false;
}>({
  // Non-null unless a field opts in with `nullable: true`, so the SDL says what's guaranteed.
  defaultFieldNullability: false,
  // Scope auth must be first so its checks wrap every other plugin's resolvers.
  plugins: [ScopeAuthPlugin, ErrorsPlugin, RelayPlugin, DataloaderPlugin],
  scopeAuth: {
    authScopes: (ctx) => ({
      member: ctx.viewer !== null,
      admin: ctx.viewer?.role === "admin",
    }),
  },
  relay: {
    clientMutationId: "omit",
    cursorType: "String",
    edgesFieldOptions: { nullable: false },
    nodeFieldOptions: { nullable: false },
    // `node`/`nodes` bypass root-field checks, so gate them explicitly.
    nodeQueryOptions: { authScopes: { member: true } },
    nodesQueryOptions: { authScopes: { member: true } },
  },
  errors: {
    defaultTypes: [],
    // createValue → CreateValueSuccess / CreateValueResult
    defaultResultOptions: { name: ({ fieldName }) => `${upperFirst(fieldName)}Success` },
    defaultUnionOptions: { name: ({ fieldName }) => `${upperFirst(fieldName)}Result` },
  },
});

builder.scalarType("DateTime", {
  description: "An ISO-8601 timestamp, e.g. 2026-10-11T17:00:00.000Z",
  serialize: (value) => value.toISOString(),
  parseValue: (value) => {
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) throw new TypeError("Invalid DateTime");
    return date;
  },
});

builder.scalarType("Date", {
  description: "A calendar date, e.g. 2026-10-11",
  serialize: (value) => value,
  parseValue: (value) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new TypeError("Invalid Date");
    }
    return value;
  },
});

builder.scalarType("JSON", {
  description:
    "Arbitrary JSON. Kudo bodies are ProseMirror documents, validated server-side (ADR-0007).",
  serialize: (value) => value,
  parseValue: (value) => value,
});
