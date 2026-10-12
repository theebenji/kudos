import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent } from "storybook/test";
import { TextArea, TextField } from "./Field";

const meta = {
  title: "Primitives/Field",
  component: TextField,
  args: { label: "Value name", placeholder: "e.g. Curiosity" },
  decorators: [
    (Story) => (
      <div style={{ width: "22rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Text: Story = {
  play: async ({ canvas }) => {
    const input = canvas.getByRole("textbox", { name: "Value name" });
    await userEvent.type(input, "Curiosity");
    await expect(input).toHaveValue("Curiosity");
  },
};

export const WithDescription: Story = {
  args: { description: "Shown on every kudo tagged with it." },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("textbox")).toHaveAccessibleDescription(
      "Shown on every kudo tagged with it.",
    );
  },
};

export const WithError: Story = {
  args: { error: "A value named “Teamwork” already exists", defaultValue: "Teamwork" },
  play: async ({ canvas }) => {
    const input = canvas.getByRole("textbox", { name: "Value name" });
    await expect(input).toBeInvalid();
    await expect(input).toHaveAccessibleDescription("A value named “Teamwork” already exists");
  },
};

export const HiddenLabel: Story = {
  args: { label: "Search people", hideLabel: true, placeholder: "Search people", type: "search" },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("searchbox", { name: "Search people" })).toBeVisible();
  },
};

function BioField() {
  const [bio, setBio] = useState("Building the web team's design system.");
  return (
    <TextArea
      label="Bio"
      description="Shown on your profile."
      maxLength={280}
      value={bio}
      onChange={(event) => setBio(event.target.value)}
    />
  );
}

export const TextAreaWithCount: StoryObj<typeof TextArea> = {
  render: () => <BioField />,
  play: async ({ canvas }) => {
    const textarea = canvas.getByRole("textbox", { name: "Bio" });
    await userEvent.clear(textarea);
    await userEvent.type(textarea, "Hello!");
    await expect(textarea).toHaveAccessibleDescription("Shown on your profile. 6 / 280");
  },
};
