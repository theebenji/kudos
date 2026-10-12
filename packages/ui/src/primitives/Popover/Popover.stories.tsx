import type { Meta, StoryObj } from "@storybook/react-vite";
import { SmilePlus } from "lucide-react";
import { expect, screen, userEvent, waitFor, within } from "storybook/test";
import { Button } from "../Button/Button";
import { Dialog } from "../Dialog/Dialog";
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

/** Regression: popovers portal to <body>; one opened from inside a dialog must render above it. */
export const InsideDialog: Story = {
  render: (args) => (
    <Dialog title="Give kudos" trigger={<Button>Open dialog</Button>}>
      <Popover {...args} />
    </Dialog>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Open dialog" }));
    const dialog = await screen.findByRole("dialog", { name: "Give kudos" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Add reaction" }));
    const popover = await screen.findByRole("dialog", { name: "Pick a reaction" });
    const box = popover.getBoundingClientRect();
    const topmost = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    await expect(popover.contains(topmost)).toBe(true);
  },
};
