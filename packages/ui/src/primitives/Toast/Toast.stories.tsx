import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { Button } from "../Button/Button";
import { ToastProvider, useToast } from "./Toast";

function Trigger() {
  const toast = useToast();
  return (
    <Button
      onClick={() =>
        toast.show({
          title: "Avery Admin gave you kudos",
          description: "Thanks for the onboarding doc…",
          action: { altText: "View the kudo", element: <a href="#kudo">View</a> },
        })
      }
    >
      Notify me
    </Button>
  );
}

const meta = {
  title: "Primitives/Toast",
  render: () => (
    <ToastProvider>
      <Trigger />
    </ToastProvider>
  ),
} satisfies Meta;
export default meta;

export const ShowAndDismiss: StoryObj = {
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Notify me" }));
    const region = within(canvasElement.ownerDocument.body).getByRole("region", {
      name: /Notifications/,
    });
    // Radix announces toasts through its own live region; the toast itself is a list item.
    const toast = (await within(region).findByText("Avery Admin gave you kudos")).closest(
      "li",
    ) as HTMLElement;
    await expect(toast).toHaveTextContent("Thanks for the onboarding doc…");
    // Background notifications are announced politely, never interrupting a screen reader.
    await waitFor(() =>
      expect(
        canvasElement.ownerDocument.querySelector('[role="status"][aria-live="polite"]'),
      ).toHaveTextContent(/Avery Admin gave you kudos/),
    );
    await expect(within(toast).getByRole("link", { name: "View" })).toHaveAttribute(
      "href",
      "#kudo",
    );
    await userEvent.click(within(toast).getByRole("button", { name: "Dismiss" }));
    await waitFor(() =>
      expect(within(region).queryByText("Avery Admin gave you kudos")).not.toBeInTheDocument(),
    );
  },
};
