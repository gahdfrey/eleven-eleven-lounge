"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { SEATING_LABELS, formatArrival, formatNightDate } from "@/lib/site";
import { cx } from "../ui";

export type TicketData = {
  name: string;
  night: string;
  nightTitle: string;
  time: string;
  party: number;
  seating: keyof typeof SEATING_LABELS;
  occasion: string | null;
  code?: string;
};

/** Solid bars whose widths come from the text, so each code gets its own barcode. */
function Barcode({ seed }: { seed: string }) {
  const bars: number[] = [];
  for (let i = 0; i < 26; i++) bars.push(1 + ((seed.charCodeAt(i % seed.length) * (i + 7)) % 4));
  return (
    <div className="flex h-12 items-stretch gap-[2px]" aria-hidden="true">
      {bars.map((w, i) => <span key={i} className={i % 2 ? "bg-transparent" : "bg-white/80"} style={{ width: w }} />)}
    </div>
  );
}

/** The booking as a ticket. Tilts toward the pointer and updates as the form changes. */
export function Ticket({ t, className }: { t: TicketData; className?: string }) {
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(my, [0, 1], [8, -8]), { stiffness: 150, damping: 18 });
  const rotateY = useSpring(useTransform(mx, [0, 1], [-10, 10]), { stiffness: 150, damping: 18 });
  const row = (label: string, value: string, key: string) => (
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-zinc-500">{label}</p>
      <motion.p key={key} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-1 truncate text-sm text-white">{value}</motion.p>
    </div>
  );
  return (
    <div className={cx("[perspective:1200px]", className)}>
      <motion.div
        style={{ rotateX, rotateY }}
        onPointerMove={(e) => {
          if (e.pointerType !== "mouse") return;
          const r = e.currentTarget.getBoundingClientRect();
          mx.set((e.clientX - r.left) / r.width);
          my.set((e.clientY - r.top) / r.height);
        }}
        onPointerLeave={() => { mx.set(0.5); my.set(0.5); }}
        className="relative flex overflow-hidden rounded-2xl border border-accent/50 bg-surface"
        aria-label="Your booking"
      >
        <div className="min-w-0 flex-1 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[9px] font-semibold uppercase tracking-[0.35em] text-accent">Table reservation</p>
            <motion.p key={t.party} initial={{ scale: 1.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="font-mono text-[10px] uppercase text-zinc-300">Admit {t.party}</motion.p>
          </div>
          <motion.h4 key={t.nightTitle} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="mt-3 font-display text-xl font-bold uppercase leading-tight text-white sm:text-2xl">
            {t.nightTitle}
          </motion.h4>
          <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3">
            {row("Night", formatNightDate(t.night, { weekday: "short", day: "numeric", month: "short" }), t.night)}
            {row("Arrival", formatArrival(t.time), t.time)}
            {row("Seating", SEATING_LABELS[t.seating], t.seating)}
            {row("Guest", t.name.trim() || "Your name", t.name ? "named" : "empty")}
          </div>
          {t.occasion && <p className="mt-4 inline-block rounded-full border border-accent/40 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-accent">{t.occasion}</p>}
        </div>
        {/* Perforation with notches. */}
        <div className="relative w-px border-l border-dashed border-line">
          <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full border border-accent/50 bg-black" />
          <span className="absolute -bottom-3 -left-3 h-6 w-6 rounded-full border border-accent/50 bg-black" />
        </div>
        <div className="flex w-24 shrink-0 flex-col items-center justify-between gap-3 p-4 sm:w-28">
          <p className="font-display text-sm font-bold text-white">11<span className="text-accent">:</span>11</p>
          <Barcode seed={t.code ?? `${t.night}${t.time}${t.party}`} />
          <motion.p key={t.code ?? "pending"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={cx("font-mono text-[11px] tracking-[0.2em]", t.code ? "text-accent" : "text-zinc-600")}>
            {t.code ?? "R·····"}
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}
