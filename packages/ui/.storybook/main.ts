import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y", "@storybook/addon-vitest"],
  framework: "@storybook/react-vite",
  // The web app's original demo GIFs, so GIF stories show real images.
  staticDirs: [{ from: "../../../apps/web/public/gifs", to: "/gifs" }],
};

export default config;
