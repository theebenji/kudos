import type { CodegenConfig } from "@graphql-codegen/cli";

// Typed GraphQL documents from the API's committed SDL (ADR-0003). Output in gql/ is committed;
// `pnpm --filter @repo/web codegen` regenerates it, and lint fails if it's stale.
const config: CodegenConfig = {
  schema: "../api/schema.graphql",
  documents: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}", "!gql/**"],
  ignoreNoDocuments: true,
  generates: {
    "./gql/": {
      preset: "client",
      presetConfig: { fragmentMasking: false },
      config: {
        useTypeImports: true,
        // Apollo adds __typename to every object; type it as always present (needed for optimistic responses).
        nonOptionalTypename: true,
        enumsAsTypes: true,
        scalars: { DateTime: "string", Date: "string", JSON: "unknown", ID: "string" },
      },
    },
  },
};

export default config;
