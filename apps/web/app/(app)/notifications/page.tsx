import { brand } from "@repo/config/brand";
import { Suspense } from "react";
import { FeedSkeleton } from "@/components/kudos/FeedSkeleton";
import { NotificationList } from "@/components/notifications/NotificationList";

export const metadata = { title: `Notifications · ${brand.name}` };

export default function NotificationsPage() {
  return (
    <>
      <h1 style={{ fontSize: "var(--font-size-2xl)", marginBottom: "var(--space-4)" }}>
        Notifications
      </h1>
      <Suspense fallback={<FeedSkeleton count={3} />}>
        <NotificationList />
      </Suspense>
    </>
  );
}
