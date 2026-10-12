import type { Meta, StoryObj } from "@storybook/react-vite";
import { VisuallyHidden } from "radix-ui";
import { Skeleton } from "./Skeleton";

const meta = { title: "Primitives/Skeleton", component: Skeleton } satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const KudoPlaceholder: Story = {
  render: () => (
    // The region announces itself; the skeleton shapes are decorative.
    <div
      role="status"
      aria-busy="true"
      style={{ display: "flex", gap: "var(--space-3)", width: "24rem" }}
    >
      <VisuallyHidden.Root>Loading kudo</VisuallyHidden.Root>
      <Skeleton shape="circle" width="2.5rem" height="2.5rem" />
      <div style={{ display: "grid", gap: "var(--space-2)", flex: 1 }}>
        <Skeleton width="60%" />
        <Skeleton />
        <Skeleton width="80%" />
      </div>
    </div>
  ),
};
