"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import { motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import { SITE } from "@/lib/site";
import { Magnetic } from "./motion";

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

  return (
    <section ref={sectionRef} className="relative h-[250vh]" aria-label="Welcome">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
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
              <a href="#reserve" className="inline-flex h-12 items-center rounded-full bg-accent px-7 text-xs font-bold uppercase tracking-[0.25em] text-black transition-colors hover:bg-accent-strong">Reserve a table</a>
            </Magnetic>
            <Magnetic>
              <a href="#nights" className="inline-flex h-12 items-center rounded-full border border-white/30 px-7 text-xs font-bold uppercase tracking-[0.25em] text-white backdrop-blur-sm transition-colors hover:border-accent hover:text-accent">The nights</a>
            </Magnetic>
          </motion.div>
        </motion.div>

        <motion.div style={{ opacity: hintOpacity }} className="pointer-events-none absolute inset-x-0 bottom-8 flex flex-col items-center gap-3">
          <span className="text-[9px] uppercase tracking-[0.5em] text-muted">Scroll to enter</span>
          <span className="relative h-12 w-px overflow-hidden bg-white/15">
            <motion.span className="absolute inset-x-0 top-0 h-1/2 bg-accent" animate={{ y: ["-100%", "200%"] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }} />
          </span>
        </motion.div>

        {/* Fades to black as the camera passes through the portal. */}
        <motion.div style={{ opacity: fade }} className="pointer-events-none absolute inset-0 bg-black" />
      </div>
    </section>
  );
}
