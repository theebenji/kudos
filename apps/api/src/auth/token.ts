import { jwtVerify } from "jose";

// The contract between apps/web (signer) and this API (verifier). See ADR-0005.
export const API_TOKEN_ISSUER = "kudos-web";
export const API_TOKEN_AUDIENCE = "kudos-api";

export type ApiTokenClaims = { userId: string };

/** Returns the claims of a valid token, or null for a missing, expired, or forged one. */
export async function verifyApiToken(
  token: string,
  secret: string,
): Promise<ApiTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      issuer: API_TOKEN_ISSUER,
      audience: API_TOKEN_AUDIENCE,
      algorithms: ["HS256"],
      requiredClaims: ["sub", "exp"],
    });
    return payload.sub ? { userId: payload.sub } : null;
  } catch {
    return null;
  }
}

export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  const match = header?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}
