import { clsx } from "clsx";
import { DropdownMenu } from "radix-ui";
import type { ComponentPropsWithRef, ReactNode } from "react";
import styles from "./Menu.module.css";

export type MenuProps = {
  /** The trigger, rendered with `asChild` (usually an IconButton labelled "More actions"). */
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "center" | "end";
};

/** Action menu with arrow-key navigation and typeahead (Radix DropdownMenu). */
export function Menu({ trigger, children, align = "end" }: MenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className={styles.content} align={align} sideOffset={4}>
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export type MenuItemProps = ComponentPropsWithRef<typeof DropdownMenu.Item> & {
  tone?: "default" | "danger";
  icon?: ReactNode;
};

export function MenuItem({ tone = "default", icon, className, children, ...props }: MenuItemProps) {
  return (
    <DropdownMenu.Item
      className={clsx(styles.item, tone === "danger" && styles.danger, className)}
      {...props}
    >
      {icon && (
        <span aria-hidden="true" className={styles.icon}>
          {icon}
        </span>
      )}
      {children}
    </DropdownMenu.Item>
  );
}

export function MenuSeparator() {
  return <DropdownMenu.Separator className={styles.separator} />;
}
