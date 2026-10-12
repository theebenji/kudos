"use client";

import { X } from "lucide-react";
import { Toast as ToastPrimitive } from "radix-ui";
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import styles from "./Toast.module.css";

export type ToastOptions = {
  title: string;
  description?: ReactNode;
  /** Optional action, e.g. "View" linking to the kudo. Rendered as the child you pass (a link or button). */
  action?: { altText: string; element: ReactNode };
  durationMs?: number;
  /**
   * "background" (default): announced politely, for things that happen on their own (a new notification).
   * "foreground": announced assertively, only for the direct result of the user's own action.
   */
  type?: "background" | "foreground";
};

type ToastApi = { show: (toast: ToastOptions) => void };
const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast must be used inside <ToastProvider>");
  return api;
}

const MAX_VISIBLE = 3;

/**
 * Transient, polite announcements (Radix Toast): screen readers hear them via a live region,
 * F8 moves focus to the toasts, Escape or the close button dismisses, hover/focus pauses the timer.
 */
export function ToastProvider({
  children,
  label = "Notifications",
}: {
  children: ReactNode;
  label?: string;
}) {
  const [toasts, setToasts] = useState<(ToastOptions & { id: number })[]>([]);
  const show = useCallback((toast: ToastOptions) => {
    setToasts((current) => [
      ...current.slice(-(MAX_VISIBLE - 1)),
      { ...toast, id: Date.now() + Math.random() },
    ]);
  }, []);
  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      <ToastPrimitive.Provider swipeDirection="right" label={label}>
        {children}
        {toasts.map((toast) => (
          <ToastPrimitive.Root
            key={toast.id}
            className={styles.toast}
            duration={toast.durationMs ?? 6000}
            type={toast.type ?? "background"}
            onOpenChange={(open) =>
              !open && setToasts((current) => current.filter((t) => t.id !== toast.id))
            }
          >
            <ToastPrimitive.Title className={styles.title}>{toast.title}</ToastPrimitive.Title>
            {toast.description && (
              <ToastPrimitive.Description className={styles.description}>
                {toast.description}
              </ToastPrimitive.Description>
            )}
            {toast.action && (
              <ToastPrimitive.Action asChild altText={toast.action.altText}>
                {toast.action.element}
              </ToastPrimitive.Action>
            )}
            <ToastPrimitive.Close className={styles.close} aria-label="Dismiss">
              <X size={16} aria-hidden />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className={styles.viewport} />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
