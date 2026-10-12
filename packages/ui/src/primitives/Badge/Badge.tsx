import { clsx } from "clsx";
import type { ComponentPropsWithRef } from "react";
import styles from "./Badge.module.css";

export type BadgeProps = ComponentPropsWithRef<"span"> & {
  tone?: "neutral" | "accent" | "success" | "warning" | "danger";
};

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return <span className={clsx(styles.badge, styles[tone], className)} {...props} />;
}
