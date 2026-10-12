import { Suspense } from "react";
import { FeedSkeleton } from "@/components/kudos/FeedSkeleton";
import { KudoPermalink } from "@/components/kudos/KudoPermalink";

export default async function KudoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<FeedSkeleton count={1} />}>
      <KudoPermalink id={decodeURIComponent(id)} />
    </Suspense>
  );
}
