/** GIFs bundled with the web app (served from /gifs/), used when no GIPHY key is configured. */
export const BUNDLED_GIF_PATH = "/gifs/";

const GIPHY_HOSTS = /^https:\/\/(media\d*\.giphy\.com|i\.giphy\.com)\//;

/** Only our bundled GIFs and GIPHY's media CDN may appear in a kudo (ADR-0007). */
export function isAllowedGifSrc(src: string): boolean {
  if (src.startsWith(BUNDLED_GIF_PATH)) return /^\/gifs\/[a-z0-9-]+\.gif$/.test(src);
  return GIPHY_HOSTS.test(src);
}
