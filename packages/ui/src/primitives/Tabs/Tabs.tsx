import { clsx } from "clsx";
import { Tabs as TabsPrimitive } from "radix-ui";
import type { ComponentPropsWithRef } from "react";
import styles from "./Tabs.module.css";

/** Accessible tabs (arrow-key navigation, roving focus) from Radix, styled. */
export const Tabs = TabsPrimitive.Root;

export function TabsList({
  className,
  ...props
}: ComponentPropsWithRef<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={clsx(styles.list, className)} {...props} />;
}

export function TabsTrigger({
  className,
  ...props
}: ComponentPropsWithRef<typeof TabsPrimitive.Trigger>) {
  return <TabsPrimitive.Trigger className={clsx(styles.trigger, className)} {...props} />;
}

export function TabsContent({
  className,
  ...props
}: ComponentPropsWithRef<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={clsx(styles.content, className)} {...props} />;
}
