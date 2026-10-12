import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  WEB_ORIGIN: z.url().default("http://localhost:3000"),
  DATABASE_URL: z.url(),
  /** Shared with apps/web, which signs the tokens this API verifies (ADR-0005). */
  AUTH_JWT_SECRET: z.string().min(32, "AUTH_JWT_SECRET must be at least 32 characters"),
});

export type Env = z.infer<typeof EnvSchema>;

/** Validates the environment at boot; the process exits with a readable error if it's invalid. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Invalid environment:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
