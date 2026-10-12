/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Set by vitest.config.ts to pin story tests to one theme. */
  readonly VITE_FORCED_THEME?: "light" | "dark";
}
