"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

const subscribe = () => () => {};

/**
 * Renders children into <body>. Needed for overlays opened from inside the
 * sticky header: its backdrop blur creates a new containing block, which would
 * otherwise trap `position: fixed` drawers and dialogs inside the header strip.
 */
export function Portal({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  return mounted ? createPortal(children, document.body) : null;
}
