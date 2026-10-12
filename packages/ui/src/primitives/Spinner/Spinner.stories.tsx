import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Spinner } from "./Spinner";

const meta = { title: "Primitives/Spinner", component: Spinner } satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Labelled: Story = {
  args: { label: "Loading kudos" },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("status")).toHaveTextContent("Loading kudos");
  },
};

export const Decorative: Story = { args: { size: "sm" } };
