import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./Tabs";

const meta = {
  title: "Primitives/Tabs",
  component: Tabs,
  args: { defaultValue: "received" },
  render: (args) => (
    <Tabs {...args} style={{ width: "24rem" }}>
      <TabsList aria-label="Kudos">
        <TabsTrigger value="received">Received (12)</TabsTrigger>
        <TabsTrigger value="given">Given (5)</TabsTrigger>
      </TabsList>
      <TabsContent value="received">Kudos Ana received.</TabsContent>
      <TabsContent value="given">Kudos Ana gave.</TabsContent>
    </Tabs>
  ),
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const received = canvas.getByRole("tab", { name: "Received (12)" });
    await expect(received).toHaveAttribute("aria-selected", "true");
    await userEvent.click(received);
    await userEvent.keyboard("{ArrowRight}");
    await expect(canvas.getByRole("tab", { name: "Given (5)" })).toHaveFocus();
    await expect(canvas.getByRole("tabpanel")).toHaveTextContent("Kudos Ana gave.");
  },
};
