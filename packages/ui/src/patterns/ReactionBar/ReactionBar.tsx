import { clsx } from "clsx";
import type { ReactNode } from "react";
import { Tooltip } from "../../primitives/Tooltip/Tooltip";
import styles from "./ReactionBar.module.css";

export type Reaction = {
  emoji: string;
  count: number;
  reactedByViewer: boolean;
  /** Who reacted (shown in a tooltip), e.g. ["Ana López", "Ben Ito"]. */
  names?: string[];
};

export type ReactionBarProps = {
  reactions: Reaction[];
  onToggle: (emoji: string) => void;
  /** Slot for the "add reaction" control (e.g. a Popover with the emoji picker). */
  addReaction?: ReactNode;
  disabled?: boolean;
};

export function reactionLabel({ emoji, count, reactedByViewer }: Reaction): string {
  const noun = count === 1 ? "reaction" : "reactions";
  return `${emoji} ${count} ${noun}${reactedByViewer ? ", including yours" : ""}`;
}

function namesSummary(names: string[], total: number): string {
  const shown = names.slice(0, 3);
  const others = total - shown.length;
  return others > 0
    ? `${shown.join(", ")} and ${others} other${others === 1 ? "" : "s"}`
    : new Intl.ListFormat("en").format(shown);
}

/** Emoji reaction toggles. Each is a pressed/unpressed button; counts are part of the accessible name. */
export function ReactionBar({ reactions, onToggle, addReaction, disabled }: ReactionBarProps) {
  return (
    <ul role="list" className={styles.bar} aria-label="Reactions">
      {reactions.map((reaction) => {
        const button = (
          <button
            type="button"
            className={clsx(styles.reaction, reaction.reactedByViewer && styles.active)}
            aria-pressed={reaction.reactedByViewer}
            aria-label={reactionLabel(reaction)}
            disabled={disabled}
            onClick={() => onToggle(reaction.emoji)}
          >
            <span aria-hidden="true">{reaction.emoji}</span>
            <span aria-hidden="true" className={styles.count}>
              {reaction.count}
            </span>
          </button>
        );
        return (
          <li key={reaction.emoji}>
            {reaction.names?.length ? (
              <Tooltip content={namesSummary(reaction.names, reaction.count)}>{button}</Tooltip>
            ) : (
              button
            )}
          </li>
        );
      })}
      {addReaction && <li>{addReaction}</li>}
    </ul>
  );
}
