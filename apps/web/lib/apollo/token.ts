export type ApiToken = { token: string; expiresAt: number };

/** Refresh this long before expiry, so a request never leaves with a token about to lapse. */
const EARLY_SECONDS = 30;

/**
 * Browser-side holder for the short-lived API token (ADR-0005): starts with the token the server
 * rendered with, then refreshes from /api/token. Never stored in localStorage.
 */
export function createTokenSource(initial: ApiToken | null) {
  let current = initial;
  let pending: Promise<ApiToken | null> | null = null;

  async function refresh(): Promise<ApiToken | null> {
    const response = await fetch("/api/token", { cache: "no-store" });
    if (response.status === 401) {
      // Session ended (signed out elsewhere or expired): send them to sign in.
      // A full page load on purpose: it also discards the Apollo cache of the ended session.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(`/signin?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return null;
    }
    if (!response.ok) throw new Error(`Token refresh failed: ${response.status}`);
    current = (await response.json()) as ApiToken;
    return current;
  }

  return async function getToken(): Promise<string | null> {
    if (current && current.expiresAt - EARLY_SECONDS > Date.now() / 1000) return current.token;
    pending ??= refresh().finally(() => (pending = null));
    return (await pending)?.token ?? null;
  };
}
