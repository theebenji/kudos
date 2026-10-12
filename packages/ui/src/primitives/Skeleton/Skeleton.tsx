import { clsx } from "clsx";
import type { CSSProperties } from "react";
import styles from "./Skeleton.module.css";

export type SkeletonProps = {
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  shape?: "line" | "circle" | "block";
  className?: string;
};

/** Loading placeholder. Decorative: mark the loading region with `aria-busy` instead. */
export function Skeleton({ width, height, shape = "line", className }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={clsx(styles.skeleton, styles[shape], className)}
      style={{ width, height }}
    />
  );
}
