import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card } from "./Card";

const meta = {
  title: "Primitives/Card",
  component: Card,
  args: {
    children: "Cards group related content on the page background.",
    style: { maxWidth: "24rem" },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Small: Story = { args: { padding: "sm" } };
export const AsArticle: Story = {
  args: {
    asChild: true,
    children: (
      <article>
        <h3>A kudo</h3>
        <p style={{ marginTop: "var(--space-2)" }}>Cards can render as semantic elements.</p>
      </article>
    ),
  },
};
