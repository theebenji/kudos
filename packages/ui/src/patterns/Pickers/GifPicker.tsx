"use client";

import { useEffect, useState } from "react";
import { PickerGrid } from "./PickerGrid";
import styles from "./Pickers.module.css";

export type GifResult = { id: string; src: string; alt: string; width: number; height: number };

export type GifPickerProps = {
  search: (query: string) => Promise<GifResult[]>;
  onSelect: (gif: GifResult) => void;
  /** "giphy" shows the required attribution; "bundled" explains the demo set. */
  source: "giphy" | "bundled";
};

const DEBOUNCE_MS = 250;

export function GifPicker({ search, onSelect, source }: GifPickerProps) {
  const [query, setQuery] = useState("");
  // Results and the query they answer; loading is derived, so the effect never sets state synchronously.
  const [results, setResults] = useState<{ query: string | null; gifs: GifResult[] }>({
    query: null,
    gifs: [],
  });
  const loading = results.query !== query.trim();
  const gifs = results.gifs;

  useEffect(() => {
    let cancelled = false;
    const q = query.trim();
    const timer = setTimeout(() => {
      search(q)
        .then((result) => !cancelled && setResults({ query: q, gifs: result }))
        .catch(() => !cancelled && setResults({ query: q, gifs: [] }));
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, search]);

  return (
    <PickerGrid
      label="GIFs"
      placeholder="Search GIFs"
      className={styles.gifPicker}
      query={query}
      onQueryChange={setQuery}
      items={gifs}
      getKey={(gif) => gif.id}
      getLabel={(gif) => gif.alt}
      renderItem={(gif) => (
        <img
          src={gif.src}
          alt=""
          width={gif.width}
          height={gif.height}
          loading="lazy"
          className={styles.gif}
        />
      )}
      onSelect={onSelect}
      columns={2}
      loading={loading}
      emptyText="No GIFs found"
      footer={
        source === "giphy" ? "Powered by GIPHY" : "Demo GIFs — set GIPHY_API_KEY for full search"
      }
    />
  );
}
