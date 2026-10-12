import type { Meta, StoryObj } from "@storybook/react-vite";
import { Plus } from "lucide-react";
import { expect, fn, userEvent } from "storybook/test";
import { Button } from "./Button";

const meta = {
  title: "Primitives/Button",
  component: Button,
  args: { children: "Give kudos", onClick: fn() },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Give kudos" }));
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};

export const Variants: Story = {
  render: (args) => (
    <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
      <Button {...args} variant="primary">
        Primary
      </Button>
      <Button {...args} variant="secondary">
        Secondary
      </Button>
      <Button {...args} variant="ghost">
        Ghost
      </Button>
      <Button {...args} variant="danger">
        Delete kudo
      </Button>
    </div>
  ),
};

export const Small: Story = { args: { size: "sm", variant: "secondary" } };

export const WithIcon: Story = {
  args: {
    children: (
      <>
        <Plus size={16} aria-hidden /> Give kudos
      </>
    ),
  },
};

export const Loading: Story = {
  args: { loading: true, children: "Sending…" },
  play: async ({ args, canvas }) => {
    const button = canvas.getByRole("button", { name: "Sending…" });
    await expect(button).toHaveAttribute("aria-busy", "true");
    await userEvent.click(button, { pointerEventsCheck: 0 });
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole("button"), { pointerEventsCheck: 0 });
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

export const AsLink: Story = {
  args: { asChild: true, variant: "secondary", children: <a href="#profile">View profile</a> },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "View profile" })).toHaveAttribute(
      "href",
      "#profile",
    );
  },
};
