import type { Decorator, Preview } from "@storybook/react-vite";
import "../src/tokens/tokens.css";

const withTheme: Decorator = (Story, context) => {
  const theme = context.globals.theme as string;
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
  },
};

export default preview;
