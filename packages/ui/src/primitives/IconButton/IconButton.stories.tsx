import type { Meta, StoryObj } from "@storybook/react-vite";
import { MoreHorizontal, SmilePlus, X } from "lucide-react";
import { expect, fn, userEvent } from "storybook/test";
import { IconButton } from "./IconButton";

const meta = {
  title: "Primitives/IconButton",
  component: IconButton,
  args: { label: "Add reaction", icon: <SmilePlus size={18} />, onClick: fn() },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ghost: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Add reaction" }));
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};

export const Secondary: Story = {
  args: { variant: "secondary", label: "More actions", icon: <MoreHorizontal size={18} /> },
};

export const Small: Story = { args: { size: "sm", label: "Close", icon: <X size={16} /> } };
