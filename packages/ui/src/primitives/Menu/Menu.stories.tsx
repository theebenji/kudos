import type { Meta, StoryObj } from "@storybook/react-vite";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { expect, fn, screen, userEvent, waitFor } from "storybook/test";
import { IconButton } from "../IconButton/IconButton";
import { Menu, MenuItem, MenuSeparator } from "./Menu";

const onEdit = fn();
const onDelete = fn();

const meta = {
  title: "Primitives/Menu",
  component: Menu,
  args: {
    trigger: <IconButton label="More actions" icon={<MoreHorizontal size={18} />} />,
    children: (
      <>
        <MenuItem icon={<Pencil size={16} />} onSelect={onEdit}>
          Edit
        </MenuItem>
        <MenuSeparator />
        <MenuItem icon={<Trash2 size={16} />} tone="danger" onSelect={onDelete}>
          Delete
        </MenuItem>
      </>
    ),
  },
} satisfies Meta<typeof Menu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const KeyboardSelect: Story = {
  play: async ({ canvas }) => {
    onDelete.mockClear();
    const trigger = canvas.getByRole("button", { name: "More actions" });
    trigger.focus();
    await userEvent.keyboard("{Enter}");
    await expect(await screen.findByRole("menu")).toBeVisible();
    await userEvent.keyboard("{ArrowDown}{Enter}");
    await expect(onDelete).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  },
};
