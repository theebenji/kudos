import path from "node:path";
import { fileURLToPath } from "node:url";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig, type TestProjectInlineConfiguration } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/** Every story (render + play function + axe checks) in headless Chromium, pinned to one theme. */
function storybookProject(theme: "light" | "dark"): TestProjectInlineConfiguration {
  return {
    extends: true,
    plugins: [storybookTest({ configDir: path.join(dirname, ".storybook") })],
    // Read by .storybook/preview.tsx; overrides the toolbar theme so axe checks contrast per theme.
    define: { "import.meta.env.VITE_FORCED_THEME": JSON.stringify(theme) },
    test: {
      name: `storybook-${theme}`,
      browser: {
        enabled: true,
        headless: true,
        provider: playwright(),
        instances: [{ browser: "chromium" }],
      },
    },
  };
}

export default defineConfig({
  test: {
    projects: [
      { extends: true, test: { name: "unit", environment: "node", include: ["src/**/*.test.ts"] } },
      storybookProject("light"),
      storybookProject("dark"),
    ],
  },
});
