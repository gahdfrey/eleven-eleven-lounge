"use client";

import { MotionConfig } from "framer-motion";
import { Cursor, Loader, SiteNav } from "./SiteChrome";
import { ScrollProgress } from "./motion";

/** Wraps the public website: honours "reduce motion", adds the nav, cursor, intro and scroll bar. */
export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <Loader />
      <ScrollProgress />
      <Cursor />
      <SiteNav />
      {children}
    </MotionConfig>
  );
}
