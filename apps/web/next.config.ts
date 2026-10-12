import { existsSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

// One .env at the monorepo root serves every app (see .env.example). `.env.local` first so it wins;
// loadEnvFile never overrides variables that are already set (e.g. by Docker or the shell).
for (const file of [".env.local", ".env"]) {
  const envPath = path.resolve(import.meta.dirname, "../..", file);
  if (existsSync(envPath)) process.loadEnvFile(envPath);
}

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript + CSS Modules source (ADR-0008).
  transpilePackages: ["@repo/ui", "@repo/config", "@repo/db"],
  // Self-contained server bundle for the Docker image.
  output: "standalone",
};

export default nextConfig;
