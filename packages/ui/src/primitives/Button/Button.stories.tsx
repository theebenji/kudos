import type { Meta, StoryObj } from "@storybook/react-vite";
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

export const Secondary: Story = { args: { variant: "secondary" } };

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole("button"), { pointerEventsCheck: 0 });
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

export const AsLink: Story = {
  args: { asChild: true, children: <a href="#profile">View profile</a> },
};
