import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, userEvent, waitFor, within } from "storybook/test";
import { Button } from "../Button/Button";
import { TextArea } from "../Field/Field";
import { Dialog, DialogClose } from "./Dialog";

const meta = {
  title: "Primitives/Dialog",
  component: Dialog,
  args: {
    title: "Give kudos",
    description: "Recognize someone for something great.",
    trigger: <Button>Give kudos</Button>,
    children: <TextArea label="Message" />,
    footer: (
      <>
        <DialogClose asChild>
          <Button variant="secondary">Cancel</Button>
        </DialogClose>
        <Button>Send</Button>
      </>
    ),
  },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: "Give kudos" });
    await userEvent.click(trigger);

    // Dialogs render in a portal, outside the story canvas.
    const dialog = await screen.findByRole("dialog", { name: "Give kudos" });
    await expect(dialog).toHaveAccessibleDescription("Recognize someone for something great.");
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await expect(trigger).toHaveFocus();
  },
};

export const CloseButtons: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Give kudos" }));
    const dialog = within(await screen.findByRole("dialog"));
    await userEvent.click(dialog.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await userEvent.click(canvas.getByRole("button", { name: "Give kudos" }));
    await userEvent.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Close" }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  },
};

/** Open by default so Chromatic snapshots the dialog itself. */
export const Open: Story = {
  args: { open: true, trigger: undefined },
  play: async () => {
    // Regression: without the base reset's border-box sizing, the textarea overflowed the dialog.
    const dialog = await screen.findByRole("dialog");
    const field = within(dialog).getByRole("textbox", { name: "Message" });
    await expect(getComputedStyle(field).boxSizing).toBe("border-box");
    await expect(field.getBoundingClientRect().right).toBeLessThanOrEqual(
      dialog.getBoundingClientRect().right,
    );
  },
};
