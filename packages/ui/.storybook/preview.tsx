import type { Decorator, Preview } from "@storybook/react-vite";
import "../src/styles/reset.css";
import "../src/tokens/tokens.css";
import "./preview.css";

type Theme = "system" | "light" | "dark";

const withTheme: Decorator = (Story, context) => {
  // The test projects pin a theme (see vitest.config.ts); otherwise the toolbar decides.
  const theme =
    (import.meta.env.VITE_FORCED_THEME as Theme | undefined) ?? (context.globals.theme as Theme);
  if (theme === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", theme);
  return <Story />;
};

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Color theme",
      toolbar: {
        title: "Theme",
        icon: "mirror",
        items: ["system", "light", "dark"],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: "light" },
  decorators: [withTheme],
  parameters: {
    layout: "centered",
    backgrounds: { disable: true },
    // Accessibility violations fail story tests (WCAG 2.2 AA is a hard requirement).
    a11y: { test: "error" },
    // Chromatic snapshots every story in both themes.
    chromatic: { modes: { light: { theme: "light" }, dark: { theme: "dark" } } },
  },
};

export default preview;
