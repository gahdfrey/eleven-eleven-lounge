"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import { SITE } from "@/lib/site";
import { Magnetic } from "./motion";
import { VenueStatusPill } from "./extras";

const PortalScene = dynamic(() => import("./PortalScene"), { ssr: false });

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Full-screen 3D portal that stays pinned while you scroll the first 1.5
 * screens; the camera flies into it and the headline dissolves.
 */
export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const progressRef = useRef(0);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  useMotionValueEvent(scrollYProgress, "change", (v) => { progressRef.current = v; });

  const textOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const textScale = useTransform(scrollYProgress, [0, 0.45], [1, 1.25]);
  const textBlur = useTransform(scrollYProgress, [0, 0.4], ["blur(0px)", "blur(12px)"]);
  const hintOpacity = useTransform(scrollYProgress, [0, 0.1], [1, 0]);
  const fade = useTransform(scrollYProgress, [0.82, 1], [0, 1]);

  const digits = ["1", "1", ":", "1", "1"];

  // Click the sky to send a wish into the portal.
  const [wishes, setWishes] = useState(0);
  const [toast, setToast] = useState<number | null>(null);
  const makeWish = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest("a, button")) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 2 - 1;
    const y = -(((e.clientY - r.top) / r.height) * 2 - 1);
    window.dispatchEvent(new CustomEvent("portal:wish", { detail: { x, y } }));
    setWishes((n) => n + 1);
    setToast(Date.now());
  };

  return (
    <section ref={sectionRef} className="relative h-[250vh]" aria-label="Welcome">
      <div className="sticky top-0 h-[100svh] overflow-hidden" onClick={makeWish} data-cursor="Wish">
        <PortalScene progressRef={progressRef} />

        <motion.div style={{ opacity: textOpacity, scale: textScale, filter: textBlur }} className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <motion.p
            initial={{ opacity: 0, letterSpacing: "1em" }}
            animate={{ opacity: 1, letterSpacing: "0.6em" }}
            transition={{ duration: 1.6, ease: EASE, delay: 0.3 }}
            className="mb-6 text-[10px] font-medium uppercase text-accent sm:text-xs"
          >
            {SITE.city} · Thursday — Sunday
          </motion.p>
          <h1 className="font-display text-[22vw] font-bold leading-none tracking-[0.04em] text-white sm:text-[15vw] lg:text-[11rem]" aria-label="11:11">
            {digits.map((d, i) => (
              <span key={i} className="inline-block overflow-hidden align-bottom" aria-hidden="true">
                <motion.span
                  className={`inline-block ${d === ":" ? "text-accent" : ""}`}
                  initial={{ y: "110%", rotateX: -80 }}
                  animate={{ y: 0, rotateX: 0 }}
                  transition={{ duration: 1.1, ease: EASE, delay: 0.5 + i * 0.09 }}
                >
                  {d}
                </motion.span>
              </span>
            ))}
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: EASE, delay: 1.2 }}
            className="mt-6 font-display text-sm uppercase tracking-[0.35em] text-zinc-200 sm:text-lg"
          >
            {SITE.tagline}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: EASE, delay: 1.45 }}
            className="pointer-events-auto mt-10 flex flex-wrap items-center justify-center gap-3"
          >
            <Magnetic>
              <a href="#reserve" data-cursor="Book" className="inline-flex h-12 items-center rounded-full bg-accent px-7 text-xs font-bold uppercase tracking-[0.25em] text-black transition-colors hover:bg-accent-strong">Reserve a table</a>
            </Magnetic>
            <Magnetic>
              <a href="#nights" data-cursor="Explore" className="inline-flex h-12 items-center rounded-full border border-white/30 px-7 text-xs font-bold uppercase tracking-[0.25em] text-white backdrop-blur-sm transition-colors hover:border-accent hover:text-accent">The nights</a>
            </Magnetic>
          </motion.div>
        </motion.div>

        <motion.div style={{ opacity: hintOpacity }} className="pointer-events-none absolute inset-x-0 bottom-8 flex flex-col items-center gap-3">
          <span className="px-6 text-center text-[9px] uppercase tracking-[0.5em] text-muted">Scroll to enter<span className="hidden sm:inline"> · tap the sky to make a wish</span></span>
          <span className="relative h-12 w-px overflow-hidden bg-white/15">
            <motion.span className="absolute inset-x-0 top-0 h-1/2 bg-accent" animate={{ y: ["-100%", "200%"] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }} />
          </span>
        </motion.div>

        <motion.div style={{ opacity: hintOpacity }} className="absolute bottom-6 left-5 hidden sm:left-8 md:block">
          <VenueStatusPill />
        </motion.div>
        <div className="absolute inset-x-0 top-20 flex justify-center md:hidden">
          <VenueStatusPill />
        </div>

        <AnimatePresence>
          {toast && (
            <motion.p
              key={toast}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.5 }}
              onAnimationComplete={() => setTimeout(() => setToast((t) => (t === toast ? null : t)), 1800)}
              className="pointer-events-none absolute bottom-36 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-accent/50 bg-black/70 px-5 py-2 text-[10px] uppercase tracking-[0.3em] text-white backdrop-blur-md"
              role="status"
            >
              ✦ {wishes === 1 ? "Your wish is on its way" : `${wishes} wishes sent tonight`}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Fades to black as the camera passes through the portal. */}
        <motion.div style={{ opacity: fade }} className="pointer-events-none absolute inset-0 bg-black" />
      </div>
    </section>
  );
}
