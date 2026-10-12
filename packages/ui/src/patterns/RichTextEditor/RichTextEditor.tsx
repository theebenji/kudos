"use client";

import { type RichTextDoc, toPlainText } from "@repo/rich-text";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { PluginKey } from "@tiptap/pm/state";
import {
  exitSuggestion,
  type SuggestionKeyDownProps,
  type SuggestionProps,
} from "@tiptap/suggestion";
import { clsx } from "clsx";
import { Bold, ImagePlay, Italic, Link as LinkIcon, List, ListOrdered, Smile } from "lucide-react";
import { Toolbar } from "radix-ui";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "../../primitives/Button/Button";
import { TextField } from "../../primitives/Field/Field";
import { Popover } from "../../primitives/Popover/Popover";
import { useListNavigation } from "../../utils/use-list-navigation";
import { EmojiPicker } from "../Pickers/EmojiPicker";
import { type GifResult, GifPicker } from "../Pickers/GifPicker";
import { kudoExtensions } from "./extensions";
import styles from "./RichTextEditor.module.css";

export type MentionCandidate = { id: string; label: string; description?: string | null };

export type RichTextEditorProps = {
  label: string;
  description?: ReactNode;
  error?: string | null;
  initialContent?: RichTextDoc;
  onChange: (doc: RichTextDoc, text: string) => void;
  searchMentions: (query: string) => Promise<MentionCandidate[]>;
  searchGifs: (query: string) => Promise<GifResult[]>;
  gifSource: "giphy" | "bundled";
  /** Plain-text limit shown as a counter (the server enforces it too). */
  maxLength?: number;
  placeholder?: string;
};

type MentionState = {
  items: MentionCandidate[];
  command: (item: MentionCandidate) => void;
  top: number;
  left: number;
};

/**
 * The kudo message editor: Tiptap limited to the server's node allowlist, a single-tab-stop
 * formatting toolbar (Radix Toolbar), @mention suggestions using the active-descendant pattern,
 * emoji and GIF pickers, and a character counter.
 */
export function RichTextEditor({
  label,
  description,
  error,
  initialContent,
  onChange,
  searchMentions,
  searchGifs,
  gifSource,
  maxLength = 500,
  placeholder = "Say thanks…",
}: RichTextEditorProps) {
  const id = useId();
  const ids = {
    label: `${id}-label`,
    help: `${id}-help`,
    error: `${id}-error`,
    count: `${id}-count`,
    mentions: `${id}-mentions`,
  };
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [mention, setMention] = useState<MentionState | null>(null);
  const [mentionLoading, setMentionLoading] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [gifOpen, setGifOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [length, setLength] = useState(() =>
    initialContent ? toPlainText(initialContent).length : 0,
  );
  const searchRef = useRef(searchMentions);
  // The suggestion plugin is configured once; it reaches current React state through these refs.
  const keyDownRef = useRef<(props: SuggestionKeyDownProps) => boolean>(() => false);
  // One key per editor instance, so this editor's mention popup can be closed programmatically.
  const mentionKey = useMemo(() => new PluginKey("kudoMention"), []);

  const position = (props: SuggestionProps<MentionCandidate>) => {
    const rect = props.clientRect?.();
    const box = wrapperRef.current?.getBoundingClientRect();
    return rect && box
      ? { top: rect.bottom - box.top + 4, left: Math.max(0, rect.left - box.left) }
      : { top: 0, left: 0 };
  };

  const extensions = useMemo(
    () =>
      kudoExtensions({
        placeholder,
        suggestion: {
          pluginKey: mentionKey,
          char: "@",
          items: async ({ query }) => {
            setMentionLoading(true);
            try {
              return (await searchRef.current(query)).slice(0, 6);
            } finally {
              setMentionLoading(false);
            }
          },
          render: () => ({
            onStart: (props: SuggestionProps<MentionCandidate>) =>
              setMention({
                items: props.items,
                command: (item) => props.command({ id: item.id, label: item.label }),
                ...position(props),
              }),
            onUpdate: (props: SuggestionProps<MentionCandidate>) =>
              setMention({
                items: props.items,
                command: (item) => props.command({ id: item.id, label: item.label }),
                ...position(props),
              }),
            onKeyDown: (props: SuggestionKeyDownProps) => keyDownRef.current(props),
            onExit: () => setMention(null),
          }),
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- configured once; live values flow through refs
    [],
  );

  const editor = useEditor({
    extensions,
    content: initialContent ?? "",
    // Next.js renders on the server first; render the editor only in the browser to avoid hydration mismatches.
    immediatelyRender: false,
    onUpdate: ({ editor: e }) => {
      const doc = e.getJSON() as RichTextDoc;
      const text = toPlainText(doc);
      setLength(text.length);
      onChange(doc, text);
    },
  });

  const nav = useListNavigation({
    count: mention?.items.length ?? 0,
    defaultIndex: 0,
    onSelect: (index) => {
      const item = mention?.items[index];
      if (item) mention?.command(item);
    },
    onEscape: () => {
      if (!mention) return false;
      setMention(null);
      return true;
    },
  });
  // The suggestion plugin and its search are configured once; keep the refs they call pointed at the
  // latest props/state (updated after render, as React requires).
  useLayoutEffect(() => {
    searchRef.current = searchMentions;
    keyDownRef.current = ({ event }) => {
      if (!mention) return false;
      if (nav.onKeyDown(event)) return true;
      // While the popup is open, Enter never breaks the line mid-mention (results may still be loading).
      if (event.key === "Enter") {
        event.preventDefault();
        return true;
      }
      return false;
    };
  });
  // A new suggestion list starts from the default (first) option again.
  useEffect(() => {
    nav.setActiveIndex(-1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the suggestion list changes
  }, [mention?.items]);

  const over = length > maxLength;
  const activeOptionId =
    mention && nav.activeIndex >= 0 ? `${ids.mentions}-${nav.activeIndex}` : undefined;

  // The contenteditable gets its accessible name, description and combobox state as attributes.
  useEffect(() => {
    const dom = editor?.view.dom;
    if (!dom) return;
    const attrs: Record<string, string | null> = {
      role: "textbox",
      "aria-multiline": "true",
      "aria-labelledby": ids.label,
      "aria-describedby": [description && ids.help, ids.count, (error || over) && ids.error]
        .filter(Boolean)
        .join(" "),
      "aria-invalid": error || over ? "true" : null,
      "aria-autocomplete": "list",
      // role=textbox can't take aria-expanded (axe: aria-allowed-attr); the live region announces suggestions.
      "aria-controls": mention ? ids.mentions : null,
      "aria-activedescendant": activeOptionId ?? null,
    };
    for (const [name, value] of Object.entries(attrs)) {
      if (value === null) dom.removeAttribute(name);
      else dom.setAttribute(name, value);
    }
  });

  // Escape closes the mention popup and nothing else. Radix dialogs/popovers listen for Escape in the
  // document's capture phase, so this listens earlier (window, capture) and stops the event there.
  useEffect(() => {
    const view = editor?.view;
    if (!mention || !view) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !view.dom.contains(document.activeElement)) return;
      event.stopPropagation();
      event.stopImmediatePropagation();
      exitSuggestion(view, mentionKey);
      setMention(null);
    };
    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [editor, mention, mentionKey]);

  const marks = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e?.isActive("bold") ?? false,
      italic: e?.isActive("italic") ?? false,
      bulletList: e?.isActive("bulletList") ?? false,
      orderedList: e?.isActive("orderedList") ?? false,
      link: (e?.getAttributes("link").href as string | undefined) ?? "",
    }),
  });

  const insertEmoji = (emoji: string) => {
    editor?.chain().focus().insertContent(emoji).run();
    setEmojiOpen(false);
  };
  const insertGif = (gif: GifResult) => {
    editor
      ?.chain()
      .focus()
      .insertContent({
        type: "gif",
        attrs: { src: gif.src, alt: gif.alt, width: gif.width, height: gif.height },
      })
      .insertContent(" ")
      .run();
    setGifOpen(false);
  };
  const applyLink = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const href = String(new FormData(event.currentTarget).get("href") ?? "").trim();
    const chain = editor?.chain().focus().extendMarkRange("link");
    if (href) chain?.setLink({ href }).run();
    else chain?.unsetLink().run();
    setLinkOpen(false);
  };

  return (
    <div className={styles.field}>
      <div className={styles.header}>
        <span id={ids.label} className={styles.label}>
          {label}
        </span>
        <span id={ids.count} className={clsx(styles.count, over && styles.countOver)}>
          {`${length} / ${maxLength}`}
        </span>
      </div>
      {description && (
        <p id={ids.help} className={styles.description}>
          {description}
        </p>
      )}
      <div ref={wrapperRef} className={clsx(styles.box, (error || over) && styles.invalid)}>
        <Toolbar.Root className={styles.toolbar} aria-label="Formatting">
          <Toolbar.Button
            className={styles.tool}
            aria-label="Bold"
            aria-pressed={marks?.bold}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            <Bold size={16} aria-hidden />
          </Toolbar.Button>
          <Toolbar.Button
            className={styles.tool}
            aria-label="Italic"
            aria-pressed={marks?.italic}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            <Italic size={16} aria-hidden />
          </Toolbar.Button>
          <Toolbar.Button
            className={styles.tool}
            aria-label="Bulleted list"
            aria-pressed={marks?.bulletList}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            <List size={16} aria-hidden />
          </Toolbar.Button>
          <Toolbar.Button
            className={styles.tool}
            aria-label="Numbered list"
            aria-pressed={marks?.orderedList}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered size={16} aria-hidden />
          </Toolbar.Button>
          <Popover
            label="Link"
            open={linkOpen}
            onOpenChange={setLinkOpen}
            trigger={
              <Toolbar.Button
                className={styles.tool}
                aria-label="Link"
                aria-pressed={Boolean(marks?.link)}
              >
                <LinkIcon size={16} aria-hidden />
              </Toolbar.Button>
            }
          >
            <form className={styles.linkForm} onSubmit={applyLink}>
              <TextField
                label="Link URL"
                name="href"
                type="url"
                defaultValue={marks?.link}
                placeholder="https://"
              />
              <Button type="submit" size="sm">
                {marks?.link ? "Update link" : "Add link"}
              </Button>
            </form>
          </Popover>
          <Toolbar.Separator className={styles.separator} />
          <Popover
            label="Emoji"
            open={emojiOpen}
            onOpenChange={setEmojiOpen}
            trigger={
              <Toolbar.Button className={styles.tool} aria-label="Insert emoji">
                <Smile size={16} aria-hidden />
              </Toolbar.Button>
            }
          >
            <EmojiPicker onSelect={insertEmoji} />
          </Popover>
          <Popover
            label="GIFs"
            open={gifOpen}
            onOpenChange={setGifOpen}
            trigger={
              <Toolbar.Button className={styles.tool} aria-label="Insert GIF">
                <ImagePlay size={16} aria-hidden />
              </Toolbar.Button>
            }
          >
            <GifPicker search={searchGifs} source={gifSource} onSelect={insertGif} />
          </Popover>
        </Toolbar.Root>
        <EditorContent editor={editor} className={styles.editor} />
        {mention && (
          <ul
            id={ids.mentions}
            role="listbox"
            aria-label="People to mention"
            className={styles.mentions}
            style={{ top: mention.top, left: mention.left }}
          >
            {mention.items.length === 0 && (
              <li className={styles.noMatch}>
                {mentionLoading ? "Searching…" : "No people found"}
              </li>
            )}
            {mention.items.map((item, index) => (
              // Keyboard selection goes through the editor (active descendant); this is for the mouse.
              // eslint-disable-next-line jsx-a11y/click-events-have-key-events
              <li
                key={item.id}
                id={`${ids.mentions}-${index}`}
                role="option"
                aria-selected={index === nav.activeIndex}
                className={clsx(styles.mention, index === nav.activeIndex && styles.mentionActive)}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => nav.setActiveIndex(index)}
                onClick={() => mention.command(item)}
              >
                <span className={styles.mentionName}>{item.label}</span>
                {item.description && <span className={styles.mentionMeta}>{item.description}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
      {(error || over) && (
        <p id={ids.error} className={styles.error} role="alert">
          {error ?? `Keep it under ${maxLength} characters`}
        </p>
      )}
      <p aria-live="polite" className={styles.visuallyHidden}>
        {mention && !mentionLoading
          ? `${mention.items.length} people to mention. Use up and down arrows, then Enter.`
          : ""}
      </p>
    </div>
  );
}
