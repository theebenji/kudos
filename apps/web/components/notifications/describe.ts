import type { NotificationKind } from "@/gql/graphql";

type Describable = { kind: NotificationKind; count: number; actor?: { name: string } | null };

/** One line of text for a notification, used by the list and by toasts. */
export function describeNotification({ kind, count, actor }: Describable): string {
  const who = actor?.name ?? "Someone";
  switch (kind) {
    case "KUDO_RECEIVED":
      return `${who} gave you kudos`;
    case "MENTION":
      return `${who} mentioned you in a kudo`;
    case "COMMENT":
      return `${who} commented on a kudo`;
    case "REACTION":
      return count > 1
        ? `${who} and ${count - 1} ${count - 1 === 1 ? "other" : "others"} reacted to a kudo`
        : `${who} reacted to a kudo`;
  }
}
