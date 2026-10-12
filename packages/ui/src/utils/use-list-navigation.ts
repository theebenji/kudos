import { type KeyboardEvent, useCallback, useState } from "react";

export type ListNavigationOptions = {
  count: number;
  onSelect: (index: number) => void;
  /** Items per row for 2-D grids (emoji, GIFs): ArrowLeft/Right move by one, Up/Down by a row. */
  columns?: number;
  /** Called on Escape; return true if it was handled (e.g. a popup closed). */
  onEscape?: () => boolean;
  /**
   * Option highlighted until the user moves (e.g. 0 for @mentions, so Enter picks the first match).
   * Part of the state itself rather than set in an effect, so a fast Enter can't arrive before it.
   */
  defaultIndex?: number;
};

/**
 * Keyboard navigation for the WAI-ARIA "active descendant" pattern: focus stays in the text input
 * while arrow keys move a highlighted option, announced via `aria-activedescendant`.
 * https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
 */
export function useListNavigation({
  count,
  onSelect,
  columns = 1,
  onEscape,
  defaultIndex = -1,
}: ListNavigationOptions) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const current = activeIndex === -1 ? defaultIndex : activeIndex;
  const clamped = count === 0 ? -1 : Math.min(current, count - 1);

  const onKeyDown = useCallback(
    (event: KeyboardEvent | globalThis.KeyboardEvent): boolean => {
      const move = (next: number) => {
        event.preventDefault();
        setActiveIndex(Math.max(0, Math.min(count - 1, next)));
        return true;
      };
      if (count === 0 && event.key !== "Escape") return false;
      const grid = columns > 1;
      switch (event.key) {
        case "ArrowDown":
          return move(clamped < 0 ? 0 : clamped + columns);
        case "ArrowUp":
          return move(clamped < 0 ? count - 1 : clamped - columns);
        case "ArrowRight":
          return grid ? move(clamped + 1) : false;
        case "ArrowLeft":
          return grid ? move(clamped - 1) : false;
        case "Home":
          return event.ctrlKey || grid ? move(0) : false;
        case "End":
          return event.ctrlKey || grid ? move(count - 1) : false;
        case "Enter":
          if (clamped < 0) return false;
          event.preventDefault();
          onSelect(clamped);
          return true;
        case "Escape":
          if (onEscape?.()) {
            event.preventDefault();
            event.stopPropagation();
            setActiveIndex(-1);
            return true;
          }
          return false;
        default:
          return false;
      }
    },
    [clamped, columns, count, onEscape, onSelect],
  );

  return { activeIndex: clamped, setActiveIndex, onKeyDown };
}
