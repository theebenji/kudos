/**
 * The only place the product name lives in code.
 * Renaming the product? See docs/guides/renaming-the-project.md.
 */
export const brand = {
  name: "Kudos",
  tagline: "Recognize the people who make work better.",
} as const;

export type Brand = typeof brand;
