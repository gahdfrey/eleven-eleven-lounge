"use client";

import { MotionConfig } from "framer-motion";
import { Cursor, Loader, SiteNav } from "./SiteChrome";
import { ScrollProgress } from "./motion";
import { SmoothScroll } from "./smooth";
import { ChapterRail, WishMoment } from "./extras";

/**
 * Wraps the public website: honours "reduce motion", adds smooth scrolling,
 * the nav, cursor, intro, scroll bar, and (on the home page) the chapter rail.
 */
export function SiteShell({ children, home = false }: { children: React.ReactNode; home?: boolean }) {
  return (
    <MotionConfig reducedMotion="user">
      <SmoothScroll />
      {home && <Loader />}
      <ScrollProgress />
      <Cursor />
      <SiteNav />
      {home && <ChapterRail />}
      <WishMoment />
      {children}
    </MotionConfig>
  );
}
