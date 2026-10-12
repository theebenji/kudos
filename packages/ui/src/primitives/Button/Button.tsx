import { Slot } from "@radix-ui/react-slot";
import { clsx } from "clsx";
import type { ComponentPropsWithRef } from "react";
import styles from "./Button.module.css";

export type ButtonProps = ComponentPropsWithRef<"button"> & {
  variant?: "primary" | "secondary";
  /** Render the child element (e.g. a link) with button styles instead of a `<button>`. */
  asChild?: boolean;
};

export function Button({ variant = "primary", asChild = false, className, ...props }: ButtonProps) {
  const Component = asChild ? Slot : "button";
  return <Component className={clsx(styles.button, styles[variant], className)} {...props} />;
}
