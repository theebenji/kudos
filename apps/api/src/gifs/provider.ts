import { BUNDLED_GIFS } from "@repo/rich-text";

export type Gif = { id: string; src: string; alt: string; width: number; height: number };

/** Where GIF search results come from (swap point, docs/architecture.md). */
export interface GifProvider {
  readonly source: "bundled" | "giphy";
  search(query: string, limit: number): Promise<Gif[]>;
}

/** The original demo set from @repo/rich-text; matches the query against alt text and tags. */
export class BundledGifProvider implements GifProvider {
  readonly source = "bundled";

  async search(query: string, limit: number): Promise<Gif[]> {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const matches = words.length
      ? BUNDLED_GIFS.filter((gif) =>
          words.every(
            (w) => gif.tags.some((t) => t.startsWith(w)) || gif.alt.toLowerCase().includes(w),
          ),
        )
      : BUNDLED_GIFS;
    return matches
      .slice(0, limit)
      .map(({ id, src, alt, width, height }) => ({ id, src, alt, width, height }));
  }
}

type GiphyImage = { url: string; width: string; height: string };
type GiphyResponse = {
  data: { id: string; title: string; images: { fixed_height: GiphyImage } }[];
};

/** GIPHY search, proxied so the key stays server-side. Content rating is capped at PG-13. */
export class GiphyGifProvider implements GifProvider {
  readonly source = "giphy";

  constructor(
    private readonly apiKey: string,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async search(query: string, limit: number): Promise<Gif[]> {
    const endpoint = query.trim() ? "search" : "trending";
    const url = new URL(`https://api.giphy.com/v1/gifs/${endpoint}`);
    url.search = new URLSearchParams({
      api_key: this.apiKey,
      q: query,
      limit: String(limit),
      rating: "pg-13",
    }).toString();
    const response = await this.fetchFn(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`GIPHY responded ${response.status}`);
    const body = (await response.json()) as GiphyResponse;
    return body.data.map((gif) => ({
      id: gif.id,
      src: gif.images.fixed_height.url,
      alt: gif.title || "GIF",
      width: Number(gif.images.fixed_height.width),
      height: Number(gif.images.fixed_height.height),
    }));
  }
}

export function createGifProvider(apiKey: string | undefined): GifProvider {
  return apiKey ? new GiphyGifProvider(apiKey) : new BundledGifProvider();
}
