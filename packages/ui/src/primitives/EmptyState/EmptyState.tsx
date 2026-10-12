import type { ReactNode } from "react";
import styles from "./EmptyState.module.css";

export type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  /** Usually a Button, e.g. "Give the first kudo". */
  action?: ReactNode;
  /** Heading level that fits the surrounding outline. */
  headingLevel?: 2 | 3 | 4;
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  headingLevel = 3,
}: EmptyStateProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <div className={styles.empty}>
      {icon && (
        <span aria-hidden="true" className={styles.icon}>
          {icon}
        </span>
      )}
      <Heading className={styles.title}>{title}</Heading>
      {description && <p className={styles.description}>{description}</p>}
      {action}
    </div>
  );
}
