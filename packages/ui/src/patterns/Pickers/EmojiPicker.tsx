import { useMemo, useState } from "react";
import { EMOJI } from "./emoji-data";
import { PickerGrid } from "./PickerGrid";
import styles from "./Pickers.module.css";

export type EmojiPickerProps = { onSelect: (emoji: string) => void };

export function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [query, setQuery] = useState("");
  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? EMOJI.filter(([, name, keywords]) => name.includes(q) || keywords.includes(q))
      : EMOJI;
  }, [query]);
  return (
    <PickerGrid
      label="Emoji"
      placeholder="Search emoji"
      query={query}
      onQueryChange={setQuery}
      items={items}
      getKey={([emoji]) => emoji}
      getLabel={([, name]) => name}
      renderItem={([emoji]) => (
        <span className={styles.emoji} aria-hidden="true">
          {emoji}
        </span>
      )}
      onSelect={([emoji]) => onSelect(emoji)}
      columns={8}
      emptyText="No matching emoji"
    />
  );
}
