"use client";

import { useSyncExternalStore } from "react";

const MINUTE = 60_000;
let current = Date.now();
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    current = Date.now();
    timer = setInterval(() => {
      current = Date.now();
      for (const l of listeners) l();
    }, MINUTE);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

/**
 * The current time, ticking every minute — or `null` during server rendering and hydration.
 * Server and browser clocks/timezones differ, so time-relative text must not be part of the
 * hydrated HTML; React re-renders with the browser's clock right after hydrating.
 */
export function useNow(): Date | null {
  const now = useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
  return now === null ? null : new Date(now);
}
