import "server-only";
import { SignJWT } from "jose";
import { env } from "./env";

// Must match apps/api/src/auth/token.ts (ADR-0005).
const ISSUER = "kudos-web";
const AUDIENCE = "kudos-api";
export const API_TOKEN_TTL_SECONDS = 5 * 60;

/** A short-lived token the GraphQL API trusts. Carries only the user id; the API reads the role from the DB. */
export async function mintApiToken(userId: string): Promise<{ token: string; expiresAt: number }> {
  const expiresAt = Math.floor(Date.now() / 1000) + API_TOKEN_TTL_SECONDS;
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(new TextEncoder().encode(env().AUTH_JWT_SECRET));
  return { token, expiresAt };
}
