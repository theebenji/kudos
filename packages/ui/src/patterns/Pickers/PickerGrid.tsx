import { clsx } from "clsx";
import { type ReactNode, useId, useRef } from "react";
import { Spinner } from "../../primitives/Spinner/Spinner";
import { useListNavigation } from "../../utils/use-list-navigation";
import styles from "./Pickers.module.css";

export type PickerGridProps<T> = {
  /** Accessible name for the search field and the results listbox. */
  label: string;
  query: string;
  onQueryChange: (query: string) => void;
  items: T[];
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  onSelect: (item: T) => void;
  columns: number;
  loading?: boolean;
  emptyText: string;
  footer?: ReactNode;
  placeholder?: string;
  className?: string;
};

/**
 * Searchable grid of choices (emoji, GIFs). Same pattern as the combobox: focus stays in the search
 * field, arrow keys move the highlighted option in 2-D, Enter picks it.
 */
export function PickerGrid<T>({
  label,
  query,
  onQueryChange,
  items,
  getKey,
  getLabel,
  renderItem,
  onSelect,
  columns,
  loading,
  emptyText,
  footer,
  placeholder,
  className,
}: PickerGridProps<T>) {
  const id = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const nav = useListNavigation({
    count: items.length,
    columns,
    onSelect: (index) => {
      const item = items[index];
      if (item) onSelect(item);
    },
  });
  const activeId = nav.activeIndex >= 0 ? `${id}-${nav.activeIndex}` : undefined;
  const status = loading ? "Searching…" : items.length ? `${items.length} results` : emptyText;

  return (
    <div className={clsx(styles.picker, className)}>
      <input
        type="search"
        className={styles.search}
        role="combobox"
        aria-label={`Search ${label.toLowerCase()}`}
        aria-expanded="true"
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={activeId}
        autoComplete="off"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          onQueryChange(e.target.value);
          nav.setActiveIndex(-1);
        }}
        onKeyDown={(e) => {
          if (nav.onKeyDown(e) && activeId) {
            listRef.current
              ?.querySelector(`#${CSS.escape(activeId)}`)
              ?.scrollIntoView({ block: "nearest" });
          }
        }}
      />
      <ul
        ref={listRef}
        id={`${id}-list`}
        role="listbox"
        aria-label={label}
        className={styles.grid}
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {items.map((item, index) => (
          // Mouse picks here; keyboard picks through the search field (active descendant).
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events
          <li
            key={getKey(item)}
            id={`${id}-${index}`}
            role="option"
            aria-selected={index === nav.activeIndex}
            aria-label={getLabel(item)}
            className={clsx(styles.cell, index === nav.activeIndex && styles.active)}
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => nav.setActiveIndex(index)}
            onClick={() => onSelect(item)}
          >
            {renderItem(item)}
          </li>
        ))}
      </ul>
      {(loading || items.length === 0) && (
        <p className={styles.status}>
          {loading && <Spinner size="sm" />} {loading ? "Searching…" : emptyText}
        </p>
      )}
      <p aria-live="polite" className={styles.visuallyHidden}>
        {status}
      </p>
      {footer && <p className={styles.footer}>{footer}</p>}
    </div>
  );
}
