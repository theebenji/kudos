"use client";

import { Button, Spinner } from "@repo/ui";
import { useEffect, useRef, useState, useTransition } from "react";
import type { KudoFieldsFragment } from "@/gql/graphql";
import { KudoItem } from "./KudoItem";
import styles from "./KudoList.module.css";

type Props = {
  kudos: KudoFieldsFragment[];
  hasMore: boolean;
  loadMore: () => Promise<unknown>;
  /** Shown when there are no kudos at all. */
  empty: React.ReactNode;
  /** Accessible name for the list, e.g. "Kudos feed". */
  label: string;
};

/**
 * A paginated list of kudos. Loads the next page when the end scrolls into view, and always offers
 * a "Load more" button too (keyboard and assistive-tech users, and browsers without IntersectionObserver).
 */
export function KudoList({ kudos, hasMore, loadMore, empty, label }: Props) {
  const [isPending, startTransition] = useTransition();
  const [announcement, setAnnouncement] = useState("");
  const sentinel = useRef<HTMLDivElement>(null);

  const more = () =>
    startTransition(async () => {
      const before = kudos.length;
      await loadMore();
      setAnnouncement(`Loaded more kudos. Showing ${before}+.`);
    });

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !isPending) more();
      },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  });

  if (kudos.length === 0) return <>{empty}</>;
  return (
    <section aria-label={label} aria-busy={isPending}>
      <ul role="list" className={styles.list}>
        {kudos.map((kudo) => (
          <li key={kudo.id}>
            <KudoItem kudo={kudo} />
          </li>
        ))}
      </ul>
      <div ref={sentinel} className={styles.footer}>
        {hasMore ? (
          <Button variant="secondary" onClick={more} loading={isPending}>
            Load more
          </Button>
        ) : (
          <p className={styles.end}>You&apos;re all caught up.</p>
        )}
        {isPending && <Spinner label="Loading more kudos" size="sm" />}
      </div>
      <p aria-live="polite" className={styles.visuallyHidden}>
        {announcement}
      </p>
    </section>
  );
}
