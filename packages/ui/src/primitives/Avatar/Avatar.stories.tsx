import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Avatar, AvatarGroup } from "./Avatar";

const meta = {
  title: "Primitives/Avatar",
  component: Avatar,
  args: { name: "Ana López" },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Initials: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("img", { name: "Ana López" })).toHaveTextContent("AL");
  },
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
      <Avatar name="Ana López" size="xs" />
      <Avatar name="Ana López" size="sm" />
      <Avatar name="Ana López" size="md" />
      <Avatar name="Ana López" size="lg" />
    </div>
  ),
};

/** A broken image URL falls back to initials. */
export const BrokenImage: Story = {
  args: { src: "/does-not-exist.png" },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("AL")).toBeVisible();
  },
};

export const Group: StoryObj<typeof AvatarGroup> = {
  render: () => (
    <AvatarGroup
      people={[
        { name: "Ana López" },
        { name: "Ben Ito" },
        { name: "Cleo Park" },
        { name: "Dev Shah" },
        { name: "Eve Moss" },
      ]}
    />
  ),
  play: async ({ canvas }) => {
    const group = canvas.getByRole("img", {
      name: "Ana López, Ben Ito, Cleo Park, Dev Shah, Eve Moss",
    });
    await expect(group).toHaveTextContent("+2");
  },
};
