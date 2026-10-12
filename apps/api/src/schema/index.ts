import { lexicographicSortSchema, printSchema } from "graphql";
import { builder } from "./builder";
import "./errors";
import "./types/user";
import "./types/value";
import "./types/kudo";
import "./types/search";
import "./types/engagement";
import "./types/notification";

builder.queryType({
  fields: (t) => ({
    health: t.string({ description: "Liveness check; needs no auth.", resolve: () => "ok" }),
  }),
});
builder.mutationType({});

export const schema = builder.toSchema();

/** The SDL committed as apps/api/schema.graphql and consumed by the web app's codegen. */
export const printedSchema = () => `${printSchema(lexicographicSortSchema(schema))}\n`;
