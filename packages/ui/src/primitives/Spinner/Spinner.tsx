import { clsx } from "clsx";
import styles from "./Spinner.module.css";

export type SpinnerProps = {
  /** Announced to screen readers. Omit when a parent already conveys the busy state (e.g. `aria-busy`). */
  label?: string;
  size?: "sm" | "md";
  className?: string;
};

export function Spinner({ label, size = "md", className }: SpinnerProps) {
  return (
    <span
      className={clsx(styles.spinner, styles[size], className)}
      {...(label ? { role: "status" } : { "aria-hidden": true })}
    >
      {label && <span className={styles.label}>{label}</span>}
    </span>
  );
}
