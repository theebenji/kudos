import { clsx } from "clsx";
import type { ComponentPropsWithRef, ReactNode } from "react";
import styles from "./IconButton.module.css";

export type IconButtonProps = Omit<ComponentPropsWithRef<"button">, "children" | "aria-label"> & {
  /** Required accessible name; icon-only buttons have no visible text. */
  label: string;
  icon: ReactNode;
  variant?: "ghost" | "secondary";
  size?: "sm" | "md";
};

export function IconButton({
  label,
  icon,
  variant = "ghost",
  size = "md",
  className,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className={clsx(styles.button, styles[variant], styles[size], className)}
      {...props}
    >
      <span aria-hidden="true" className={styles.icon}>
        {icon}
      </span>
    </button>
  );
}
