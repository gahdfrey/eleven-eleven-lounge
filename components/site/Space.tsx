"use client";

import { useRef, useState } from "react";
import { motion, useMotionValue, useMotionValueEvent, useScroll, useSpring, useTransform } from "framer-motion";
import { SPACES } from "@/lib/site";
import { cx } from "../ui";
import { RevealText } from "./motion";

const STEP = 360 / SPACES.length;

/** Line-art marks for each area (single stroke, accent colour, no fills). */
function SpaceIcon({ kind }: { kind: (typeof SPACES)[number]["icon"] }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 64 64" className="h-11 w-11 text-accent sm:h-14 sm:w-14" aria-hidden="true">
      {kind === "floor" && <><circle cx="32" cy="32" r="8" {...common} /><circle cx="32" cy="32" r="17" {...common} /><circle cx="32" cy="32" r="26" {...common} strokeDasharray="3 5" /></>}
      {kind === "vip" && <><path d="M12 44 L16 22 L26 32 L32 16 L38 32 L48 22 L52 44 Z" {...common} /><path d="M12 50 H52" {...common} /></>}
      {kind === "booth" && <><path d="M14 18 V40 Q14 50 24 50 H40 Q50 50 50 40 V18" {...common} /><circle cx="32" cy="34" r="6" {...common} /></>}
      {kind === "bar" && <><path d="M8 28 H56" {...common} /><path d="M18 36 V52 M30 36 V52 M42 36 V52" {...common} /><path d="M14 36 H22 M26 36 H34 M38 36 H46" {...common} /></>}
      {kind === "dj" && <><circle cx="26" cy="34" r="16" {...common} /><circle cx="26" cy="34" r="3" {...common} /><path d="M46 14 L50 18 L40 40" {...common} /></>}
      {kind === "door" && <><path d="M18 54 V26 Q18 12 32 12 Q46 12 46 26 V54" {...common} /><path d="M10 54 H54" {...common} /><circle cx="40" cy="36" r="1.5" {...common} /></>}
    </svg>
  );
}

/**
 * "Inside 11:11": the venue's areas on a 3D ring. Scrolling turns the ring one
 * area at a time; you can also drag it. The front panel lights up.
 */
export function Space() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  const scrollTurn = useTransform(scrollYProgress, [0.05, 0.95], [0, -STEP * (SPACES.length - 1)], { clamp: true });
  const drag = useMotionValue(0);
  const dragSpring = useSpring(drag, { stiffness: 80, damping: 20 });
  const rotation = useTransform(() => scrollTurn.get() + dragSpring.get());
  const ringRotate = useSpring(rotation, { stiffness: 120, damping: 24, mass: 0.6 });

  const [active, setActive] = useState(0);
  useMotionValueEvent(rotation, "change", (deg) => {
    const i = Math.round(-deg / STEP);
    setActive(((i % SPACES.length) + SPACES.length) % SPACES.length);
  });

  const dragging = useRef<{ x: number; start: number } | null>(null);

  return (
    <section id="space" ref={sectionRef} className="relative h-[260vh]" aria-label="Inside 11:11">
      <div
        className="sticky top-0 flex h-[100svh] touch-pan-y flex-col overflow-hidden"
        onPointerDown={(e) => { dragging.current = { x: e.clientX, start: drag.get() }; }}
        onPointerMove={(e) => {
          if (!dragging.current) return;
          drag.set(dragging.current.start + (e.clientX - dragging.current.x) * 0.25);
        }}
        onPointerUp={() => {
          // Snap so a panel faces you.
          if (dragging.current) drag.set(Math.round((drag.get() + scrollTurn.get()) / STEP) * STEP - scrollTurn.get());
          dragging.current = null;
        }}
        onPointerLeave={() => { dragging.current = null; }}
        data-cursor="Drag"
      >
        <div className="mx-auto w-full max-w-7xl px-5 pt-24 sm:px-8">
          <p className="mb-5 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.45em] text-accent"><span className="h-px w-8 bg-accent" />The space</p>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <RevealText as="h2" text="Inside 11:11" className="font-display text-[2.1rem] font-bold uppercase text-white min-[400px]:text-5xl sm:text-7xl" />
            <p className="font-mono text-sm text-zinc-500">
              <span className="text-accent">{String(active + 1).padStart(2, "0")}</span> / {String(SPACES.length).padStart(2, "0")} · scroll or drag
            </p>
          </div>
        </div>

        <div className="relative flex flex-1 items-center justify-center pt-[min(4rem,6svh)] [--ring-r:210px] [perspective:1100px] sm:pt-0 sm:[--ring-r:340px] lg:[--ring-r:470px] lg:[perspective:1600px]">
          {/* A drawn floor line under the ring. */}
          <div aria-hidden="true" className="absolute bottom-[12%] h-24 w-[min(90vw,62rem)] rounded-[50%] border border-accent/20" />
          <motion.div className="relative mt-6 h-[min(19.5rem,40svh)] w-[12.5rem] [transform-style:preserve-3d] will-change-transform sm:h-[min(25rem,52svh)] sm:w-[16rem] lg:w-[18rem]" style={{ rotateY: ringRotate }}>
            {SPACES.map((s, i) => {
              const on = i === active;
              return (
                <div
                  key={s.name}
                  className={cx(
                    "absolute inset-0 flex select-none flex-col justify-between overflow-hidden rounded-3xl border bg-surface p-5 sm:p-6 transition-[border-color,opacity] duration-500 [backface-visibility:hidden]",
                    on ? "border-accent opacity-100" : "border-line opacity-55",
                  )}
                  style={{ transform: `rotateY(${i * STEP}deg) translateZ(var(--ring-r))` }}
                >
                  <div className="flex items-start justify-between">
                    <SpaceIcon kind={s.icon} />
                    <span className="font-mono text-xs text-zinc-500">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-accent">{s.tag}</p>
                    <h3 className="mt-2 font-display text-lg font-bold uppercase leading-tight text-white sm:mt-3 sm:text-2xl">{s.name}</h3>
                    <p className="mt-2 text-[13px] leading-relaxed text-zinc-400 sm:mt-3 sm:text-sm">{s.body}</p>
                    <p className="mt-3 border-t border-line pt-3 font-mono text-xs text-zinc-300 sm:mt-4">{s.capacity}</p>
                  </div>
                </div>
              );
            })}
          </motion.div>
        </div>

        {/* Progress ticks. */}
        <div className="flex justify-center gap-2 pb-6 sm:pb-10">
          {SPACES.map((s, i) => (
            <span key={s.name} className={cx("h-1 rounded-full transition-all duration-500", i === active ? "w-8 bg-accent" : "w-3 bg-zinc-700")} />
          ))}
        </div>
      </div>
    </section>
  );
}
