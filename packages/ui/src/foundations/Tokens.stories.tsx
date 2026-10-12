import type { Meta, StoryObj } from "@storybook/react-vite";
import { scales, themes } from "../tokens/tokens";

/** Living reference for the design tokens, rendered from the same source as tokens.css. */
const meta = { title: "Foundations/Tokens", parameters: { layout: "padded" } } satisfies Meta;

export default meta;
type Story = StoryObj;

const cell = {
  padding: "var(--space-2) var(--space-3)",
  borderBottom: "1px solid var(--color-border)",
  textAlign: "left",
} as const;

export const Colors: Story = {
  render: () => (
    <table style={{ borderCollapse: "collapse", fontSize: "var(--font-size-sm)" }}>
      <caption style={{ textAlign: "left", fontWeight: 600, paddingBottom: "var(--space-2)" }}>
        Semantic colors (current theme)
      </caption>
      <thead>
        <tr>
          <th style={cell}>Token</th>
          <th style={cell}>Swatch</th>
          <th style={cell}>Light</th>
          <th style={cell}>Dark</th>
        </tr>
      </thead>
      <tbody>
        {Object.keys(themes.light).map((name) => (
          <tr key={name}>
            <td style={cell}>
              <code>--color-{name}</code>
            </td>
            <td style={cell}>
              <span
                style={{
                  display: "inline-block",
                  width: "3rem",
                  height: "1.5rem",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--color-border-strong)",
                  background: `var(--color-${name})`,
                }}
              />
            </td>
            <td style={cell}>
              <code>{themes.light[name as keyof typeof themes.light]}</code>
            </td>
            <td style={cell}>
              <code>{themes.dark[name as keyof typeof themes.dark]}</code>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
};

export const Spacing: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--space-2)", fontSize: "var(--font-size-sm)" }}>
      {Object.entries(scales.space).map(([key, value]) => (
        <div key={key} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <code style={{ width: "6rem" }}>--space-{key}</code>
          <span style={{ width: value, height: "1rem", background: "var(--color-accent)" }} />
          <span>{value}</span>
        </div>
      ))}
    </div>
  ),
};

export const Typography: Story = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--space-3)" }}>
      {Object.entries(scales["font-size"]).map(([key, value]) => (
        <p key={key} style={{ fontSize: value }}>
          <code style={{ fontSize: "var(--font-size-sm)" }}>--font-size-{key}</code> Recognize the
          people who make work better.
        </p>
      ))}
    </div>
  ),
};
