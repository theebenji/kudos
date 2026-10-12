import "server-only";
import { z } from "zod";

const optional = z.string().trim().min(1).optional().catch(undefined);

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.url(),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  /** Shared with apps/api, which verifies the tokens this app signs (ADR-0005). */
  AUTH_JWT_SECRET: z.string().min(32, "AUTH_JWT_SECRET must be at least 32 characters"),
  /** Explicit opt-in/out for the "sign in as seeded user" picker; defaults to on outside production. */
  AUTH_DEV_LOGIN: z.enum(["true", "false"]).optional(),
  AUTH_OIDC_ISSUER: optional,
  AUTH_OIDC_CLIENT_ID: optional,
  AUTH_OIDC_CLIENT_SECRET: optional,
  AUTH_OIDC_NAME: z.string().default("SSO"),
  API_URL: z.url().default("http://localhost:4000/graphql"),
});

export type WebEnv = z.infer<typeof EnvSchema> & { devLoginEnabled: boolean; oidcEnabled: boolean };

let cached: WebEnv | undefined;

/** Validated lazily at request time, so `next build` doesn't need runtime secrets. */
export function env(): WebEnv {
  if (cached) return cached;
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) throw new Error(`Invalid environment:\n${z.prettifyError(result.error)}`);
  const e = result.data;
  cached = {
    ...e,
    devLoginEnabled: e.AUTH_DEV_LOGIN ? e.AUTH_DEV_LOGIN === "true" : e.NODE_ENV !== "production",
    oidcEnabled: Boolean(e.AUTH_OIDC_ISSUER && e.AUTH_OIDC_CLIENT_ID && e.AUTH_OIDC_CLIENT_SECRET),
  };
  return cached;
}
