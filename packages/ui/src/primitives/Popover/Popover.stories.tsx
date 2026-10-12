import type { Meta, StoryObj } from "@storybook/react-vite";
import { SmilePlus } from "lucide-react";
import { expect, screen, userEvent, waitFor } from "storybook/test";
import { IconButton } from "../IconButton/IconButton";
import { Popover } from "./Popover";

const meta = {
  title: "Primitives/Popover",
  component: Popover,
  args: {
    label: "Pick a reaction",
    trigger: <IconButton label="Add reaction" icon={<SmilePlus size={18} />} variant="secondary" />,
    children: <p>The emoji picker goes here (Phase 4).</p>,
  },
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: "Add reaction" });
    await userEvent.click(trigger);
    await expect(await screen.findByRole("dialog", { name: "Pick a reaction" })).toBeVisible();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await expect(trigger).toHaveFocus();
  },
};
