"use client";

import { useQuery, useSubscription } from "@apollo/client/react";
import { useToast } from "@repo/ui";
import { Bell } from "lucide-react";
import Link from "next/link";
import { graphql } from "@/gql";
import { describeNotification } from "./describe";
import styles from "./NotificationBell.module.css";

export const UNREAD_COUNT = graphql(`
  query UnreadNotificationCount {
    unreadNotificationCount
  }
`);

const NOTIFICATION_ADDED = graphql(`
  subscription NotificationAdded {
    notificationAdded {
      id
      kind
      count
      actor {
        name
      }
      kudo {
        id
        bodyText
      }
    }
  }
`);

/** Header bell: live unread count, and a toast for each new notification (reactions stay quiet). */
export function NotificationBell() {
  const toast = useToast();
  const { data, refetch } = useQuery(UNREAD_COUNT);
  useSubscription(NOTIFICATION_ADDED, {
    onData: ({ data: event }) => {
      const n = event.data?.notificationAdded;
      if (!n) return;
      void refetch();
      if (n.kind === "REACTION") return;
      toast.show({
        title: describeNotification(n),
        description: n.kudo?.bodyText
          ? `“${n.kudo.bodyText.slice(0, 90)}${n.kudo.bodyText.length > 90 ? "…" : ""}”`
          : undefined,
        action: n.kudo
          ? {
              altText: "View the kudo",
              element: (
                <Link href={`/kudos/${encodeURIComponent(n.kudo.id)}`} className={styles.view}>
                  View
                </Link>
              ),
            }
          : undefined,
      });
    },
  });
  const unread = data?.unreadNotificationCount ?? 0;
  return (
    <Link
      href="/notifications"
      className={styles.bell}
      aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
    >
      <Bell size={18} aria-hidden />
      {unread > 0 && (
        <span className={styles.badge} aria-hidden="true">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
