import type { Meta, StoryObj } from "@storybook/react-vite";
import { PartyPopper } from "lucide-react";
import { Button } from "../Button/Button";
import { EmptyState } from "./EmptyState";

const meta = {
  title: "Primitives/EmptyState",
  component: EmptyState,
  args: {
    icon: <PartyPopper size={32} />,
    title: "No kudos yet",
    description: "When someone recognizes Ana, it will show up here.",
    action: <Button>Give Ana kudos</Button>,
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithoutAction: Story = { args: { action: undefined } };
