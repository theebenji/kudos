import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

/** Checks that the base reset (src/styles/reset.css) is loaded and does what it promises. */
const meta = { title: "Foundations/Reset", parameters: { layout: "padded" } } satisfies Meta;

export default meta;
type Story = StoryObj;

export const Behaviour: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--space-3)", maxWidth: "20rem" }}>
      <h2>Heading</h2>
      <p>
        A paragraph with an
        extraordinarily-long-unbroken-string-that-should-wrap-instead-of-overflowing.
      </p>
      <ul role="list" aria-label="UI list">
        <li>No bullets</li>
      </ul>
      <button type="button">Inherits text color</button>
      <img alt="" width={800} height={400} src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" />
      {/* Inline `display: flex` must not defeat the `hidden` attribute. */}
      <div hidden data-testid="hidden" style={{ display: "flex" }}>
        Hidden
      </div>
    </div>
  ),
  play: async ({ canvas, canvasElement }) => {
    const css = (el: Element) => getComputedStyle(el);
    const heading = canvas.getByRole("heading", { name: "Heading" });
    const paragraph = canvasElement.querySelector("p") as HTMLElement;
    const list = canvas.getByRole("list", { name: "UI list" });
    const button = canvas.getByRole("button");
    const image = canvasElement.querySelector("img") as HTMLImageElement;

    await expect(css(heading).marginBlockStart).toBe("0px");
    await expect(css(paragraph).marginBlockEnd).toBe("0px");
    await expect(css(paragraph).overflowWrap).toBe("break-word");
    await expect(paragraph.scrollWidth).toBeLessThanOrEqual(paragraph.clientWidth);
    await expect(css(list).listStyleType).toBe("none");
    await expect(css(list).paddingInlineStart).toBe("0px");
    await expect(css(button).boxSizing).toBe("border-box");
    await expect(css(button).color).toBe(css(button.parentElement as HTMLElement).color);
    await expect(image.getBoundingClientRect().width).toBeLessThanOrEqual(
      list.getBoundingClientRect().width,
    );
    await expect(image.getBoundingClientRect().height).toBeCloseTo(
      image.getBoundingClientRect().width / 2,
      0,
    );
    await expect(css(canvas.getByTestId("hidden")).display).toBe("none");
    await expect(
      Number.parseFloat(css(document.body).lineHeight) /
        Number.parseFloat(css(document.body).fontSize),
    ).toBeCloseTo(1.5, 1);
  },
};
