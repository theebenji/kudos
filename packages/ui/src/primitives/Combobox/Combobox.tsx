import { clsx } from "clsx";
import { X } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { useListNavigation } from "../../utils/use-list-navigation";
import { Spinner } from "../Spinner/Spinner";
import styles from "./Combobox.module.css";

export type ComboboxOption = { id: string; label: string; description?: string | null };

export type MultiComboboxProps<T extends ComboboxOption> = {
  label: string;
  description?: ReactNode;
  error?: string | null;
  selected: T[];
  onChange: (selected: T[]) => void;
  /** Async search; called as the user types (debounced). Already-selected options are hidden. */
  loadOptions: (query: string) => Promise<T[]>;
  renderOption?: (option: T) => ReactNode;
  /** Maximum selections; the input is disabled once reached. */
  max?: number;
  placeholder?: string;
  /** Noun for announcements, e.g. "person" → "2 people selected". */
  itemName?: { one: string; other: string };
  autoFocus?: boolean;
};

const DEBOUNCE_MS = 150;

/**
 * Multi-select combobox built in-house on the WAI-ARIA combobox pattern (ADR-0008):
 * an editable input with a listbox popup, `aria-activedescendant` for the highlighted option,
 * selected items as removable chips, and live announcements of results and selection changes.
 * The listbox renders inline (no portal), so it works inside Radix dialogs' focus traps.
 */
export function MultiCombobox<T extends ComboboxOption>({
  label,
  description,
  error,
  selected,
  onChange,
  loadOptions,
  renderOption,
  max,
  placeholder,
  itemName = { one: "item", other: "items" },
  autoFocus,
}: MultiComboboxProps<T>) {
  const id = useId();
  const ids = {
    input: `${id}-input`,
    listbox: `${id}-listbox`,
    label: `${id}-label`,
    help: `${id}-help`,
    error: `${id}-error`,
  };
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  /** ↓ on an empty input lists everyone; otherwise the listbox only appears once you type. */
  const [browsing, setBrowsing] = useState(false);
  /** Results and the query they answer; loading is derived, so effects never set state synchronously. */
  const [results, setResults] = useState<{ query: string | null; options: T[] }>({
    query: null,
    options: [],
  });
  const options = results.options;
  const [announcement, setAnnouncement] = useState("");
  const full = max !== undefined && selected.length >= max;
  const visible = options.filter((o) => !selected.some((s) => s.id === o.id));
  const count = (n: number) => `${n} ${n === 1 ? itemName.one : itemName.other}`;

  const expanded = open && !full && (query.trim() !== "" || browsing);
  const loading = expanded && results.query !== query.trim();

  // Debounced search; ignores responses that arrive after a newer query.
  useEffect(() => {
    if (!expanded) return;
    let cancelled = false;
    const q = query.trim();
    const timer = setTimeout(() => {
      loadOptions(q)
        .then((result) => {
          if (cancelled) return;
          setResults({ query: q, options: result });
          setAnnouncement(
            result.length
              ? `${count(result.length)} found. Use up and down arrows to choose.`
              : `No ${itemName.other} found.`,
          );
        })
        .catch(() => {
          if (cancelled) return;
          setResults({ query: q, options: [] });
          setAnnouncement("Search failed. Try again.");
        });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run only when the query or open state changes
  }, [query, expanded]);

  const add = (option: T) => {
    const next = [...selected, option];
    onChange(next);
    setQuery("");
    setBrowsing(false);
    setAnnouncement(`${option.label} added. ${count(next.length)} selected.`);
    inputRef.current?.focus();
  };
  const remove = (option: T) => {
    const next = selected.filter((s) => s.id !== option.id);
    onChange(next);
    setAnnouncement(`${option.label} removed. ${count(next.length)} selected.`);
    inputRef.current?.focus();
  };

  const nav = useListNavigation({
    count: visible.length,
    onSelect: (index) => {
      const option = visible[index];
      if (option) add(option);
    },
    onEscape: () => {
      if (!expanded) return false;
      setOpen(false);
      setBrowsing(false);
      return true;
    },
  });
  const activeId = expanded && nav.activeIndex >= 0 ? `${id}-option-${nav.activeIndex}` : undefined;
  const describedBy =
    [description && ids.help, error && ids.error].filter(Boolean).join(" ") || undefined;

  return (
    <div className={styles.field}>
      <label id={ids.label} htmlFor={ids.input} className={styles.label}>
        {label}
      </label>
      {description && (
        <p id={ids.help} className={styles.description}>
          {description}
        </p>
      )}
      <div className={clsx(styles.control, error && styles.invalid)}>
        {selected.length > 0 && (
          <ul role="list" className={styles.chips} aria-label={`Selected ${itemName.other}`}>
            {selected.map((option) => (
              <li key={option.id} className={styles.chip}>
                <span>{option.label}</span>
                <button
                  type="button"
                  className={styles.remove}
                  aria-label={`Remove ${option.label}`}
                  onClick={() => remove(option)}
                >
                  <X size={14} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        <input
          ref={inputRef}
          id={ids.input}
          className={styles.input}
          role="combobox"
          aria-expanded={expanded}
          aria-controls={ids.listbox}
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          autoComplete="off"
          // eslint-disable-next-line jsx-a11y/no-autofocus -- only when the composer opens with this field first
          autoFocus={autoFocus}
          disabled={full}
          placeholder={full ? `Maximum of ${max} reached` : placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            nav.setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          // Clicking an option doesn't blur the input (options cancel mousedown), so any blur closes the list.
          onBlur={() => {
            setOpen(false);
            setBrowsing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && query === "" && selected.length > 0) {
              const last = selected.at(-1);
              if (last) remove(last);
              return;
            }
            if (e.key === "ArrowDown" && !expanded) {
              e.preventDefault();
              setOpen(true);
              setBrowsing(true);
              return;
            }
            nav.onKeyDown(e);
          }}
        />
      </div>
      <div className={styles.popup} hidden={!expanded}>
        <ul id={ids.listbox} role="listbox" aria-labelledby={ids.label} className={styles.listbox}>
          {visible.map((option, index) => (
            // Options are picked with the mouse here; keyboard selection goes through the input (active descendant).
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events
            <li
              key={option.id}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={index === nav.activeIndex}
              className={clsx(styles.option, index === nav.activeIndex && styles.active)}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => nav.setActiveIndex(index)}
              onClick={() => add(option)}
            >
              {renderOption ? (
                renderOption(option)
              ) : (
                <>
                  <span className={styles.optionLabel}>{option.label}</span>
                  {option.description && (
                    <span className={styles.optionDescription}>{option.description}</span>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
        {loading && visible.length === 0 && (
          <p className={styles.status}>
            <Spinner size="sm" /> Searching…
          </p>
        )}
        {!loading && visible.length === 0 && (
          <p className={styles.status}>No {itemName.other} found</p>
        )}
      </div>
      {error && (
        <p id={ids.error} className={styles.error} role="alert">
          {error}
        </p>
      )}
      <p aria-live="polite" className={styles.visuallyHidden}>
        {announcement}
      </p>
    </div>
  );
}
