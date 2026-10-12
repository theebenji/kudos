import { clsx } from "clsx";
import { X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import type { ReactNode } from "react";
import { IconButton } from "../IconButton/IconButton";
import styles from "./Dialog.module.css";

export type DialogProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Element that opens the dialog (rendered with `asChild`, so pass a Button). */
  trigger?: ReactNode;
  /** Required: it's the dialog's accessible name. */
  title: string;
  description?: ReactNode;
  children: ReactNode;
  /** Action row, e.g. Cancel / Send. */
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
};

/** Modal dialog with focus trap, Escape to close and focus return (Radix). */
export function Dialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  footer,
  size = "md",
}: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={styles.overlay} />
        <DialogPrimitive.Content
          className={clsx(styles.content, styles[size])}
          // Escape inside an open combobox (e.g. the people picker) closes its listbox first, not the
          // whole dialog. Radix listens in the capture phase, so the check must live here.
          onEscapeKeyDown={(event) => {
            const target = event.target as HTMLElement | null;
            if (target?.getAttribute?.("aria-expanded") === "true") event.preventDefault();
          }}
          {...(description ? {} : { "aria-describedby": undefined })}
        >
          <header className={styles.header}>
            <DialogPrimitive.Title className={styles.title}>{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <IconButton label="Close" icon={<X size={18} />} size="sm" />
            </DialogPrimitive.Close>
          </header>
          {description && (
            <DialogPrimitive.Description className={styles.description}>
              {description}
            </DialogPrimitive.Description>
          )}
          <div className={styles.body}>{children}</div>
          {footer && <footer className={styles.footer}>{footer}</footer>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** Wrap a footer button so clicking it closes the dialog. */
export const DialogClose = DialogPrimitive.Close;
