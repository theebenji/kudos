import { clsx } from "clsx";
import { Slot } from "radix-ui";
import type { ComponentPropsWithRef } from "react";
import styles from "./Card.module.css";

export type CardProps = ComponentPropsWithRef<"div"> & {
  padding?: "none" | "sm" | "md";
  /** Render as the child element instead of a `<div>` (e.g. an `<article>` or `<li>`). */
  asChild?: boolean;
};

export function Card({ padding = "md", asChild = false, className, ...props }: CardProps) {
  const Component = asChild ? Slot.Root : "div";
  return (
    <Component className={clsx(styles.card, styles[`padding-${padding}`], className)} {...props} />
  );
}
