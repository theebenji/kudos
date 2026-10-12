import type { Meta, StoryObj } from "@storybook/react-vite";
import { SmilePlus } from "lucide-react";
import { useState } from "react";
import { expect, fn, screen, userEvent } from "storybook/test";
import { IconButton } from "../../primitives/IconButton/IconButton";
import { type Reaction, ReactionBar } from "./ReactionBar";

const sample: Reaction[] = [
  {
    emoji: "👏",
    count: 5,
    reactedByViewer: true,
    names: ["You", "Ana López", "Ben Ito", "Cleo Park", "Dev Shah"],
  },
  { emoji: "🎉", count: 2, reactedByViewer: false, names: ["Ana López", "Eve Moss"] },
  { emoji: "❤️", count: 1, reactedByViewer: false, names: ["Ben Ito"] },
];

const meta = {
  title: "Patterns/ReactionBar",
  component: ReactionBar,
  args: {
    reactions: sample,
    onToggle: fn(),
    addReaction: <IconButton label="Add reaction" size="sm" icon={<SmilePlus size={16} />} />,
  },
} satisfies Meta<typeof ReactionBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args, canvas }) => {
    const clap = canvas.getByRole("button", { name: "👏 5 reactions, including yours" });
    await expect(clap).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(canvas.getByRole("button", { name: "❤️ 1 reaction" }));
    await expect(args.onToggle).toHaveBeenCalledWith("❤️");
  },
};

export const WhoReacted: Story = {
  play: async ({ canvas }) => {
    canvas.getByRole("button", { name: /👏/ }).focus();
    await expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "You, Ana López, Ben Ito and 2 others",
    );
  },
};

function Interactive() {
  const [reactions, setReactions] = useState(sample);
  return (
    <ReactionBar
      reactions={reactions}
      onToggle={(emoji) =>
        setReactions((current) =>
          current.map((r) =>
            r.emoji === emoji
              ? {
                  ...r,
                  reactedByViewer: !r.reactedByViewer,
                  count: r.count + (r.reactedByViewer ? -1 : 1),
                }
              : r,
          ),
        )
      }
    />
  );
}

export const Toggling: Story = {
  render: () => <Interactive />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "🎉 2 reactions" }));
    await expect(
      canvas.getByRole("button", { name: "🎉 3 reactions, including yours" }),
    ).toHaveAttribute("aria-pressed", "true");
  },
};

export const Empty: Story = { args: { reactions: [] } };
