import { brand } from "@repo/config/brand";
import { Suspense } from "react";
import { Feed } from "@/components/kudos/Feed";
import { FeedSkeleton } from "@/components/kudos/FeedSkeleton";
import styles from "./page.module.css";

export default function FeedPage() {
  return (
    <>
      <header className={styles.header}>
        <h1>Recent kudos</h1>
        <p className={styles.tagline}>{brand.tagline}</p>
      </header>
      <Suspense fallback={<FeedSkeleton />}>
        <Feed />
      </Suspense>
    </>
  );
}
