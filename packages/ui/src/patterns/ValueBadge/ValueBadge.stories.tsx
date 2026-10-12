import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { ValueBadge } from "./ValueBadge";

const meta = {
  title: "Patterns/ValueBadge",
  component: ValueBadge,
  args: { name: "Teamwork", emoji: "🤝" },
} satisfies Meta<typeof ValueBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    // The emoji is decorative; the value name is the readable text.
    await expect(canvasElement.querySelector('[aria-hidden="true"]')).toHaveTextContent("🤝");
  },
};
export const WithoutEmoji: Story = { args: { name: "Ownership", emoji: null } };
