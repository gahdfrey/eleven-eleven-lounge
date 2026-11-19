"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

let instance: Lenis | null = null;

/** The page's smooth-scroll engine, if running (not for reduced motion or touch-only devices). */
export function getLenis() {
  return instance;
}

/** Scrolls to an element or "#id", smoothly when Lenis is running. */
export function scrollToTarget(target: string | HTMLElement, offset = 0) {
  const el = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
  if (!el) return;
  if (instance) instance.scrollTo(el, { offset, duration: 1.6 });
  else el.scrollIntoView({ behavior: "smooth" });
}

/** Inertia scrolling for the website. Native scroll events still fire, so scroll-linked animations keep working. */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ autoRaf: true, lerp: 0.085, wheelMultiplier: 0.95, anchors: { duration: 1.6 } });
    instance = lenis;
    return () => {
      lenis.destroy();
      instance = null;
    };
  }, []);
  return null;
}
