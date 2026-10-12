import type { RichTextDoc } from "@repo/rich-text";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test";
import { Button } from "../../primitives/Button/Button";
import { Dialog } from "../../primitives/Dialog/Dialog";
import { RichTextEditor, type RichTextEditorProps } from "./RichTextEditor";

const PEOPLE = [
  {
    id: "0199c3a2-6d1f-7c3e-9a1b-000000000001",
    label: "Ana López",
    description: "Software Engineer",
  },
  { id: "0199c3a2-6d1f-7c3e-9a1b-000000000002", label: "Andre Silva", description: "Designer" },
  { id: "0199c3a2-6d1f-7c3e-9a1b-000000000003", label: "Ben Ito", description: "Product Manager" },
];
const GIFS = [
  {
    id: "kudos",
    src: "/gifs/kudos.gif",
    alt: "“Kudos!” with bursting stars",
    width: 240,
    height: 180,
  },
];

const onChange = fn<(doc: RichTextDoc, text: string) => void>();

function Editor(props: Partial<RichTextEditorProps>) {
  const [text, setText] = useState("");
  return (
    <div style={{ width: "min(32rem, 100vw - 2rem)" }}>
      <RichTextEditor
        label="Message"
        description="Type @ to mention someone."
        searchMentions={async (q) =>
          PEOPLE.filter((p) => p.label.toLowerCase().includes(q.toLowerCase()))
        }
        searchGifs={async () => GIFS}
        gifSource="bundled"
        {...props}
        onChange={(doc, t) => {
          setText(t);
          onChange(doc, t);
        }}
      />
      <output
        data-testid="plain-text"
        style={{ display: "block", marginTop: "var(--space-2)", fontSize: "var(--font-size-sm)" }}
      >
        {text}
      </output>
    </div>
  );
}

const meta = { title: "Patterns/RichTextEditor", component: Editor } satisfies Meta<typeof Editor>;
export default meta;
type Story = StoryObj<typeof meta>;

const textbox = async (canvas: ReturnType<typeof within>) =>
  canvas.findByRole("textbox", { name: "Message" });

export const Typing: Story = {
  play: async ({ canvas }) => {
    const editor = await textbox(canvas);
    await expect(editor).toHaveAccessibleDescription(/Type @ to mention someone\. 0 \/ 500/);
    await userEvent.click(editor);
    await userEvent.keyboard("Great work");
    await expect(canvas.getByText("10 / 500")).toBeVisible();
    await expect(canvas.getByTestId("plain-text")).toHaveTextContent("Great work");
  },
};

export const MentionWithKeyboard: Story = {
  play: async ({ canvas }) => {
    const editor = await textbox(canvas);
    await userEvent.click(editor);
    await userEvent.keyboard("Thanks @an");
    const list = await canvas.findByRole("listbox", { name: "People to mention" });
    await expect(within(list).getAllByRole("option")).toHaveLength(2);
    await waitFor(() => expect(editor).toHaveAttribute("aria-controls", list.id));
    await expect(editor).toHaveAttribute(
      "aria-activedescendant",
      within(list).getAllByRole("option")[0]?.id,
    );

    await userEvent.keyboard("{ArrowDown}{Enter}");
    await waitFor(() =>
      expect(canvas.queryByRole("listbox", { name: "People to mention" })).not.toBeInTheDocument(),
    );
    await expect(canvas.getByTestId("plain-text")).toHaveTextContent("Thanks @Andre Silva");
    const doc = onChange.mock.lastCall?.[0];
    await expect(JSON.stringify(doc)).toContain('"type":"mention"');
  },
};

/** Enter while results are still loading doesn't break the line; once they arrive, Enter picks the first. */
export const MentionEnterWhileLoading: Story = {
  args: {
    searchMentions: async (q: string) => {
      await new Promise((r) => setTimeout(r, 400));
      return PEOPLE.filter((p) => p.label.toLowerCase().includes(q.toLowerCase()));
    },
  },
  play: async ({ canvas }) => {
    const editor = await textbox(canvas);
    await userEvent.click(editor);
    await userEvent.keyboard("Hi @ben");
    await expect(await canvas.findByText("Searching…")).toBeVisible();
    await userEvent.keyboard("{Enter}");
    await expect(editor.querySelectorAll("p")).toHaveLength(1);
    await canvas.findByRole("option", { name: /Ben Ito/ });
    await userEvent.keyboard("{Enter}");
    await expect(canvas.getByTestId("plain-text")).toHaveTextContent("Hi @Ben Ito");
  },
};

/** Regression: Enter right after the list appears picks the first match (no ArrowDown needed). */
export const MentionImmediateEnter: Story = {
  play: async ({ canvas }) => {
    const editor = await textbox(canvas);
    await userEvent.click(editor);
    await userEvent.keyboard("Hi @ben");
    await canvas.findByRole("option", { name: /Ben Ito/ });
    await userEvent.keyboard("{Enter}");
    await expect(canvas.getByTestId("plain-text")).toHaveTextContent("Hi @Ben Ito");
  },
};

export const BoldViaToolbar: Story = {
  play: async ({ canvas }) => {
    const editor = await textbox(canvas);
    await userEvent.click(editor);
    const bold = canvas.getByRole("button", { name: "Bold" });
    await userEvent.click(bold);
    await userEvent.keyboard("Wow");
    await expect(bold).toHaveAttribute("aria-pressed", "true");
    await expect(editor.querySelector("strong")).toHaveTextContent("Wow");
  },
};

export const ToolbarIsOneTabStop: Story = {
  play: async ({ canvas }) => {
    await textbox(canvas);
    await userEvent.tab();
    await expect(canvas.getByRole("button", { name: "Bold" })).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(canvas.getByRole("button", { name: "Italic" })).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByRole("textbox", { name: "Message" })).toHaveFocus();
  },
};

export const InsertEmojiAndGif: Story = {
  play: async ({ canvas }) => {
    const editor = await textbox(canvas);
    await userEvent.click(canvas.getByRole("button", { name: "Insert emoji" }));
    await userEvent.type(await screen.findByRole("combobox", { name: "Search emoji" }), "party");
    await userEvent.click(screen.getByRole("option", { name: "party popper" }));
    await expect(canvas.getByTestId("plain-text")).toHaveTextContent("🎉");

    await userEvent.click(canvas.getByRole("button", { name: "Insert GIF" }));
    await userEvent.click(
      await screen.findByRole("option", { name: "“Kudos!” with bursting stars" }),
    );
    await waitFor(() =>
      expect(editor.querySelector("img[data-gif]")).toHaveAttribute("src", "/gifs/kudos.gif"),
    );
  },
};

export const OverTheLimit: Story = {
  args: { maxLength: 20 },
  play: async ({ canvas }) => {
    const editor = await textbox(canvas);
    await userEvent.click(editor);
    await userEvent.keyboard("This message is far too long");
    await expect(editor).toHaveAttribute("aria-invalid", "true");
    await expect(canvas.getByRole("alert")).toHaveTextContent("Keep it under 20 characters");
  },
};

export const WithError: Story = { args: { error: "Write a message" } };

/** In the composer: Escape closes the mention list first, and only then the dialog. */
export const MentionEscapeInsideDialog: Story = {
  render: () => (
    <Dialog title="Give kudos" trigger={<Button>Open</Button>}>
      <Editor />
    </Dialog>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Open" }));
    const dialog = within(await screen.findByRole("dialog", { name: "Give kudos" }));
    await userEvent.click(await dialog.findByRole("textbox", { name: "Message" }));
    await userEvent.keyboard("@b");
    await dialog.findByRole("listbox", { name: "People to mention" });

    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(dialog.queryByRole("listbox", { name: "People to mention" })).not.toBeInTheDocument(),
    );
    await expect(screen.getByRole("dialog")).toBeVisible();

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  },
};
