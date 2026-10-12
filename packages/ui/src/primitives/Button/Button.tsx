import { clsx } from "clsx";
import { Slot } from "radix-ui";
import type { ComponentPropsWithRef } from "react";
import { Spinner } from "../Spinner/Spinner";
import styles from "./Button.module.css";

export type ButtonProps = ComponentPropsWithRef<"button"> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  /** Shows a spinner, sets `aria-busy`, and blocks clicks while keeping the label for screen readers. */
  loading?: boolean;
  /** Render the child element (e.g. a link) with button styles instead of a `<button>`. */
  asChild?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  asChild = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  const classes = clsx(styles.button, styles[variant], styles[size], className);
  if (asChild) {
    return (
      <Slot.Root className={classes} {...props}>
        {children}
      </Slot.Root>
    );
  }
  return (
    <button
      type="button"
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}
