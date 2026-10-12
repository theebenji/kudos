import { Card, Skeleton, VisuallyHidden } from "@repo/ui";

/** Suspense fallback for kudo lists. */
export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div role="status" aria-busy="true" style={{ display: "grid", gap: "var(--space-4)" }}>
      <VisuallyHidden.Root>Loading kudos</VisuallyHidden.Root>
      {Array.from({ length: count }, (_, i) => (
        <Card key={i}>
          <div style={{ display: "flex", gap: "var(--space-3)" }}>
            <Skeleton shape="circle" width="2.5rem" height="2.5rem" />
            <div style={{ display: "grid", gap: "var(--space-2)", flex: 1 }}>
              <Skeleton width="55%" />
              <Skeleton />
              <Skeleton width="75%" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
