import { defineConfig } from "vitest/config";

// Vite's default SSR conditions include "development", which loads graphql 17's __dev__ build
// for our code while Node-loaded deps (Pothos, Yoga) get the regular build: two graphql
// instances, and "Cannot use GraphQLObjectType from another module or realm". Drop it.
export default defineConfig({
  ssr: { resolve: { conditions: ["module", "node"] } },
  test: {
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    // One Postgres container for the whole run (Testcontainers); test files share it, so run them serially.
    globalSetup: ["./test/global-setup.ts"],
    fileParallelism: false,
    hookTimeout: 120_000,
    testTimeout: 30_000,
  },
});
