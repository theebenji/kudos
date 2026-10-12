/** Only same-origin paths, so the sign-in flow can't be used as an open redirect. */
export function safeRedirectPath(url: string | null | undefined): string {
  if (!url || !url.startsWith("/") || url.startsWith("//") || url.startsWith("/\\")) return "/";
  return url;
}
