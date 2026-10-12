import { Tooltip as TooltipPrimitive } from "radix-ui";
import type { ReactNode } from "react";
import styles from "./Tooltip.module.css";

export type TooltipProps = {
  content: ReactNode;
  /** The trigger, rendered with `asChild`: it must be a focusable element (button, link). */
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
};

/**
 * Supplementary info on hover and keyboard focus. Never put essential information only in a
 * tooltip — touch users can't reach it.
 */
export function Tooltip({ content, children, side = "top" }: TooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={300}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content className={styles.content} side={side} sideOffset={6}>
            {content}
            <TooltipPrimitive.Arrow className={styles.arrow} />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
