"use client";

import { useMutation, useSuspenseQuery } from "@apollo/client/react";
import { Avatar, Button, EmptyState, RelativeTime } from "@repo/ui";
import { BellOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { graphql } from "@/gql";
import { describeNotification } from "./describe";
import { UNREAD_COUNT } from "./NotificationBell";
import styles from "./NotificationList.module.css";

const NOTIFICATIONS = graphql(`
  query Notifications($first: Int!, $after: String) {
    unreadNotificationCount
    notifications(first: $first, after: $after) {
      edges {
        node {
          id
          kind
          count
          isRead
          createdAt
          actor {
            name
          }
          kudo {
            id
            bodyText
          }
          comment {
            body
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`);

const MARK_READ = graphql(`
  mutation MarkNotificationsRead($ids: [ID!]) {
    markNotificationsRead(ids: $ids)
  }
`);

export function NotificationList() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { data, fetchMore, refetch } = useSuspenseQuery(NOTIFICATIONS, {
    variables: { first: 30 },
  });
  const [markRead] = useMutation(MARK_READ, {
    // The result is the remaining unread count; keep the bell in sync without a refetch.
    update(cache, { data: result }) {
      if (typeof result?.markNotificationsRead === "number") {
        cache.writeQuery({
          query: UNREAD_COUNT,
          data: { __typename: "Query", unreadNotificationCount: result.markNotificationsRead },
        });
      }
    },
  });
  const items = data.notifications.edges.map((e) => e.node);

  const open = async (n: (typeof items)[number]) => {
    if (!n.isRead) await markRead({ variables: { ids: [n.id] } });
    if (n.kudo) router.push(`/kudos/${encodeURIComponent(n.kudo.id)}`);
  };

  if (items.length === 0) {
    return (
      <EmptyState
        headingLevel={2}
        icon={<BellOff size={32} />}
        title="Nothing yet"
        description="When someone recognizes, mentions or replies to you, it shows up here."
      />
    );
  }
  return (
    <>
      <div className={styles.toolbar}>
        <p className={styles.summary}>
          {data.unreadNotificationCount
            ? `${data.unreadNotificationCount} unread`
            : "All caught up"}
        </p>
        <Button
          size="sm"
          variant="secondary"
          disabled={!data.unreadNotificationCount}
          onClick={() => void markRead({ variables: { ids: null } }).then(() => refetch())}
        >
          Mark all as read
        </Button>
      </div>
      <ul role="list" className={styles.list} aria-label="Notifications">
        {items.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              className={styles.item}
              data-unread={!n.isRead || undefined}
              onClick={() => void open(n)}
              disabled={!n.kudo}
            >
              <Avatar name={n.actor?.name ?? "?"} size="sm" decorative />
              <span className={styles.text}>
                <span className={styles.title}>
                  {!n.isRead && <span className={styles.visuallyHidden}>Unread: </span>}
                  {describeNotification(n)}
                </span>
                <span className={styles.preview}>
                  {n.kudo ? (n.comment?.body ?? n.kudo.bodyText) : "This kudo was deleted"}
                </span>
                <span className={styles.time}>
                  <RelativeTime date={new Date(n.createdAt)} />
                </span>
              </span>
              {!n.isRead && <span className={styles.dot} aria-hidden="true" />}
            </button>
          </li>
        ))}
      </ul>
      {data.notifications.pageInfo.hasNextPage && (
        <div className={styles.more}>
          <Button
            variant="secondary"
            loading={isPending}
            onClick={() =>
              startTransition(
                async () =>
                  void (await fetchMore({
                    variables: { after: data.notifications.pageInfo.endCursor },
                  })),
              )
            }
          >
            Load more
          </Button>
        </div>
      )}
    </>
  );
}
