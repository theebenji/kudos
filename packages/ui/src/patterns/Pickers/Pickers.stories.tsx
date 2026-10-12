import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor } from "storybook/test";
import { EmojiPicker } from "./EmojiPicker";
import { type GifResult, GifPicker } from "./GifPicker";

const meta = { title: "Patterns/Pickers", parameters: { layout: "centered" } } satisfies Meta;
export default meta;

const onEmoji = fn();
export const Emoji: StoryObj = {
  render: () => <EmojiPicker onSelect={onEmoji} />,
  play: async ({ canvas }) => {
    onEmoji.mockClear();
    const search = canvas.getByRole("combobox", { name: "Search emoji" });
    await userEvent.type(search, "rock");
    await expect(canvas.getByRole("option", { name: "rocket" })).toBeVisible();
    await userEvent.keyboard("{ArrowDown}{Enter}");
    await expect(onEmoji).toHaveBeenCalledWith("🚀");
  },
};

export const EmojiGridNavigation: StoryObj = {
  render: () => <EmojiPicker onSelect={onEmoji} />,
  play: async ({ canvas }) => {
    const search = canvas.getByRole("combobox", { name: "Search emoji" });
    search.focus();
    // Down: first cell. Down again: one row (8 cells) further. Right: next cell.
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{ArrowRight}");
    const active = canvas.getAllByRole("option")[9] as HTMLElement;
    await expect(search).toHaveAttribute("aria-activedescendant", active.id);
  },
};

const GIFS: GifResult[] = [
  {
    id: "kudos",
    src: "/gifs/kudos.gif",
    alt: "“Kudos!” with bursting stars",
    width: 240,
    height: 180,
  },
  {
    id: "thank-you",
    src: "/gifs/thank-you.gif",
    alt: "“Thank you!” with falling confetti",
    width: 240,
    height: 180,
  },
];
const onGif = fn();
export const Gifs: StoryObj = {
  render: () => (
    <GifPicker
      source="bundled"
      onSelect={onGif}
      search={async (q) => GIFS.filter((g) => g.alt.toLowerCase().includes(q.toLowerCase()))}
    />
  ),
  play: async ({ canvas }) => {
    onGif.mockClear();
    await expect(
      await canvas.findByRole("option", { name: "“Kudos!” with bursting stars" }),
    ).toBeVisible();
    await userEvent.type(canvas.getByRole("combobox", { name: "Search gifs" }), "thank");
    // Wait for the debounced search to narrow the results before choosing.
    await waitFor(() =>
      expect(canvas.queryByRole("option", { name: /Kudos!/ })).not.toBeInTheDocument(),
    );
    await userEvent.keyboard("{ArrowDown}{Enter}");
    await expect(onGif).toHaveBeenCalledWith(GIFS[1]);
    await expect(canvas.getByText(/Demo GIFs/)).toBeVisible();
  },
};
