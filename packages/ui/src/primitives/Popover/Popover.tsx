import { Popover as PopoverPrimitive } from "radix-ui";
import type { ReactNode } from "react";
import styles from "./Popover.module.css";

export type PopoverProps = {
  /** The trigger, rendered with `asChild` (pass a Button or IconButton). */
  trigger: ReactNode;
  /** Accessible name for the popover panel, e.g. "Pick an emoji". */
  label: string;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
};

/** Non-modal floating panel (e.g. emoji and GIF pickers). Escape and outside click close it. */
export function Popover({
  trigger,
  label,
  children,
  open,
  onOpenChange,
  side = "bottom",
  align = "start",
}: PopoverProps) {
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className={styles.content}
          aria-label={label}
          side={side}
          align={align}
          sideOffset={6}
        >
          {children}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
