import type { Meta, StoryObj } from "@storybook/react-vite";
import { MoreHorizontal, Pencil, SmilePlus, Trash2 } from "lucide-react";
import { expect, fn } from "storybook/test";
import { IconButton } from "../../primitives/IconButton/IconButton";
import { Menu, MenuItem } from "../../primitives/Menu/Menu";
import { ReactionBar } from "../ReactionBar/ReactionBar";
import { KudoCard } from "./KudoCard";

const now = new Date("2026-10-11T17:00:00Z");
const person = (name: string) => ({ name, href: `#/people/${name.split(" ")[0]?.toLowerCase()}` });

const meta = {
  title: "Patterns/KudoCard",
  component: KudoCard,
  args: {
    sender: person("Avery Admin"),
    recipients: [person("Ana López")],
    value: { name: "Teamwork", emoji: "🤝" },
    createdAt: new Date("2026-10-11T14:30:00Z"),
    now,
    permalink: "#/kudos/1",
    children: (
      <p>
        Huge thanks to <strong>Ana</strong> for jumping on the incident at 2am and getting us back
        up in record time! 🎉
      </p>
    ),
    reactions: (
      <ReactionBar
        reactions={[
          { emoji: "👏", count: 4, reactedByViewer: true },
          { emoji: "🔥", count: 2, reactedByViewer: false },
        ]}
        onToggle={fn()}
        addReaction={<IconButton label="Add reaction" size="sm" icon={<SmilePlus size={16} />} />}
      />
    ),
  },
  decorators: [
    (Story) => (
      <div style={{ width: "min(36rem, 100vw - 2rem)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof KudoCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("article", { name: "Avery Admin recognized Ana López" }),
    ).toBeVisible();
    await expect(canvas.getByRole("link", { name: "2 hours ago" })).toHaveAttribute(
      "href",
      "#/kudos/1",
    );
    await expect(canvas.getByRole("link", { name: "Ana López" })).toHaveAttribute(
      "href",
      "#/people/ana",
    );
  },
};

export const SeveralRecipients: Story = {
  args: {
    recipients: [person("Ana López"), person("Ben Ito"), person("Cleo Park"), person("Dev Shah")],
    value: { name: "Above & Beyond", emoji: "🚀" },
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("article", {
        name: "Avery Admin recognized Ana López, Ben Ito, Cleo Park, and Dev Shah",
      }),
    ).toBeVisible();
  },
};

export const EditedWithActions: Story = {
  args: {
    edited: true,
    actions: (
      <Menu
        trigger={<IconButton label="More actions" size="sm" icon={<MoreHorizontal size={16} />} />}
      >
        <MenuItem icon={<Pencil size={16} />}>Edit</MenuItem>
        <MenuItem icon={<Trash2 size={16} />} tone="danger">
          Delete
        </MenuItem>
      </Menu>
    ),
  },
};

export const NoValueNoReactions: Story = {
  args: { value: null, reactions: undefined, createdAt: new Date("2026-08-02T09:00:00Z") },
};

export const LongUnbrokenText: Story = {
  args: { children: <p>{"Thank-you-".repeat(30)}</p> },
};
