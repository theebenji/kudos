"use client";

import { useMutation } from "@apollo/client/react";
import { IconButton, Popover } from "@repo/ui";
import { EmojiPicker, ReactionBar } from "@repo/ui/patterns";
import { SmilePlus } from "lucide-react";
import { useState } from "react";
import { graphql } from "@/gql";
import type { KudoFieldsFragment } from "@/gql/graphql";

const TOGGLE_REACTION = graphql(`
  mutation ToggleReaction($kudoId: ID!, $emoji: String!) {
    toggleReaction(kudoId: $kudoId, emoji: $emoji) {
      __typename
      ... on ToggleReactionSuccess {
        data {
          id
          reactions {
            emoji
            count
            reactedByViewer
            names
          }
        }
      }
    }
  }
`);

type ReactionList = KudoFieldsFragment["reactions"];

/** What the list will look like once the toggle succeeds, so the UI responds instantly. */
export function toggled(reactions: ReactionList, emoji: string): ReactionList {
  const existing = reactions.find((r) => r.emoji === emoji);
  if (!existing)
    return [
      ...reactions,
      { __typename: "ReactionSummary", emoji, count: 1, reactedByViewer: true, names: ["You"] },
    ];
  if (!existing.reactedByViewer) {
    return reactions.map((r) =>
      r.emoji === emoji
        ? { ...r, count: r.count + 1, reactedByViewer: true, names: ["You", ...r.names] }
        : r,
    );
  }
  return reactions
    .map((r) =>
      r.emoji === emoji
        ? {
            ...r,
            count: r.count - 1,
            reactedByViewer: false,
            names: r.names.filter((n) => n !== "You"),
          }
        : r,
    )
    .filter((r) => r.count > 0);
}

export function Reactions({ kudo }: { kudo: Pick<KudoFieldsFragment, "id" | "reactions"> }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [toggle] = useMutation(TOGGLE_REACTION);
  const run = (emoji: string) =>
    void toggle({
      variables: { kudoId: kudo.id, emoji },
      optimisticResponse: {
        __typename: "Mutation",
        toggleReaction: {
          __typename: "ToggleReactionSuccess",
          data: { __typename: "Kudo", id: kudo.id, reactions: toggled(kudo.reactions, emoji) },
        },
      },
    });

  return (
    <ReactionBar
      reactions={kudo.reactions}
      onToggle={run}
      addReaction={
        <Popover
          label="Add a reaction"
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          trigger={<IconButton label="Add reaction" size="sm" icon={<SmilePlus size={16} />} />}
        >
          <EmojiPicker
            onSelect={(emoji) => {
              setPickerOpen(false);
              // Picking an emoji you've already used shouldn't remove it.
              if (!kudo.reactions.some((r) => r.emoji === emoji && r.reactedByViewer)) run(emoji);
            }}
          />
        </Popover>
      }
    />
  );
}
