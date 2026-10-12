import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, userEvent } from "storybook/test";
import { Button } from "../Button/Button";
import { Tooltip } from "./Tooltip";

const meta = {
  title: "Primitives/Tooltip",
  component: Tooltip,
  args: {
    content: "Ana, Ben and 3 others",
    children: <Button variant="secondary">👏 5</Button>,
  },
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OnKeyboardFocus: Story = {
  play: async () => {
    await userEvent.tab();
    await expect(await screen.findByRole("tooltip")).toHaveTextContent("Ana, Ben and 3 others");
  },
};
