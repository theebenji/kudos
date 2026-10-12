import { defineConfig } from "tsup";

// Bundles workspace packages (@repo/*, shipped as TypeScript source) into dist;
// npm dependencies stay external and are installed by `pnpm deploy --prod`.
export default defineConfig({
  entry: ["src/index.ts", "src/worker.ts", "src/migrate.ts"],
  format: "esm",
  target: "node24",
  platform: "node",
  sourcemap: true,
  clean: true,
  noExternal: [/^@repo\//],
});
