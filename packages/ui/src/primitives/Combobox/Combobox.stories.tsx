import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, screen, userEvent, waitFor, within } from "storybook/test";
import { Button } from "../Button/Button";
import { Dialog } from "../Dialog/Dialog";
import { type ComboboxOption, MultiCombobox, type MultiComboboxProps } from "./Combobox";

const PEOPLE: ComboboxOption[] = [
  { id: "1", label: "Ana López", description: "Software Engineer · Web" },
  { id: "2", label: "Ben Ito", description: "Product Manager · Growth" },
  { id: "3", label: "Cleo Park", description: "Designer · Brand" },
  { id: "4", label: "Dev Shah", description: "Staff Engineer · Platform" },
];
const search = async (query: string) => {
  await new Promise((r) => setTimeout(r, 50));
  return PEOPLE.filter((p) => p.label.toLowerCase().includes(query.toLowerCase()));
};

function Picker(props: Partial<MultiComboboxProps<ComboboxOption>>) {
  const [selected, setSelected] = useState<ComboboxOption[]>(props.selected ?? []);
  return (
    <div style={{ width: "24rem" }}>
      <MultiCombobox
        label="Recipients"
        description="Who are you recognizing?"
        placeholder="Search people"
        itemName={{ one: "person", other: "people" }}
        loadOptions={search}
        {...props}
        selected={selected}
        onChange={setSelected}
      />
    </div>
  );
}

const meta = { title: "Primitives/Combobox", component: Picker } satisfies Meta<typeof Picker>;
export default meta;
type Story = StoryObj<typeof meta>;

export const KeyboardSelection: Story = {
  play: async ({ canvas }) => {
    const input = canvas.getByRole("combobox", { name: "Recipients" });
    await userEvent.click(input);
    await userEvent.type(input, "e");
    // Debounced async results, announced to screen readers.
    await expect(await canvas.findByRole("option", { name: /Ben Ito/ })).toBeVisible();
    await expect(input).toHaveAttribute("aria-expanded", "true");
    await waitFor(() => expect(canvas.getByText(/people found/)).toBeInTheDocument());

    await userEvent.keyboard("{ArrowDown}{ArrowDown}");
    const active = canvas.getAllByRole("option")[1] as HTMLElement;
    await expect(input).toHaveAttribute("aria-activedescendant", active.id);
    await expect(active).toHaveAttribute("aria-selected", "true");

    await userEvent.keyboard("{Enter}");
    // Every person matches "e"; the second option is Ben Ito.
    const chips = canvas.getByRole("list", { name: "Selected people" });
    await expect(within(chips).getByText("Ben Ito")).toBeVisible();
    await expect(canvas.queryByRole("option", { name: /Ben Ito/ })).not.toBeInTheDocument();
    await expect(input).toHaveValue("");
    await expect(input).toHaveFocus();
    // The list closes after a pick, so it doesn't cover the rest of the form.
    await expect(input).toHaveAttribute("aria-expanded", "false");
    await waitFor(() =>
      expect(canvas.getByText(/added\. 1 person selected\./)).toBeInTheDocument(),
    );
  },
};

export const RemoveWithBackspaceAndButton: Story = {
  args: { selected: [PEOPLE[0] as ComboboxOption, PEOPLE[1] as ComboboxOption] },
  play: async ({ canvas }) => {
    const input = canvas.getByRole("combobox", { name: "Recipients" });
    await userEvent.click(input);
    await userEvent.keyboard("{Backspace}");
    await expect(canvas.queryByRole("button", { name: "Remove Ben Ito" })).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "Remove Ana López" }));
    await expect(canvas.queryByRole("list", { name: "Selected people" })).not.toBeInTheDocument();
    await expect(input).toHaveFocus();
  },
};

export const EscapeCloses: Story = {
  play: async ({ canvas }) => {
    const input = canvas.getByRole("combobox", { name: "Recipients" });
    await userEvent.click(input);
    // Nothing pops up on focus alone; ↓ lists everyone.
    await expect(input).toHaveAttribute("aria-expanded", "false");
    await userEvent.keyboard("{ArrowDown}");
    await canvas.findByRole("option", { name: /Ana López/ });
    await userEvent.keyboard("{Escape}");
    await expect(input).toHaveAttribute("aria-expanded", "false");
  },
};

export const MaximumReached: Story = {
  args: { max: 2, selected: [PEOPLE[0] as ComboboxOption, PEOPLE[1] as ComboboxOption] },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("combobox", { name: "Recipients" })).toBeDisabled();
  },
};

export const NoResults: Story = {
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByRole("combobox"), "zzz");
    await expect(await canvas.findByText("No people found")).toBeVisible();
  },
};

export const WithError: Story = { args: { error: "Choose at least one person" } };

/** In the composer the picker lives in a dialog: the first Escape closes the listbox, the second the dialog. */
export const InsideDialog: Story = {
  render: () => (
    <Dialog title="Give kudos" trigger={<Button>Open</Button>}>
      <Picker />
    </Dialog>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Open" }));
    const dialog = await screen.findByRole("dialog", { name: "Give kudos" });
    const input = within(dialog).getByRole("combobox", { name: "Recipients" });
    await userEvent.click(input);
    await userEvent.keyboard("{ArrowDown}");
    await within(dialog).findByRole("option", { name: /Ana López/ });

    await userEvent.keyboard("{Escape}");
    await expect(input).toHaveAttribute("aria-expanded", "false");
    await expect(screen.getByRole("dialog")).toBeVisible();

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  },
};

export const ClosesOnBlur: Story = {
  render: () => (
    <>
      <Picker />
      <button type="button" style={{ marginTop: "var(--space-4)" }}>
        Next field
      </button>
    </>
  ),
  play: async ({ canvas }) => {
    const input = canvas.getByRole("combobox", { name: "Recipients" });
    await userEvent.type(input, "a");
    await canvas.findByRole("option", { name: /Ana López/ });
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: "Next field" })).toHaveFocus();
    await expect(input).toHaveAttribute("aria-expanded", "false");
  },
};
