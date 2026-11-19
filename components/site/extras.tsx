"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { NIGHTS, SITE } from "@/lib/site";
import { cx } from "../ui";
import { scrollToTarget } from "./smooth";

// ─── Live venue status ───────────────────────────────────────────────────────

type VenueStatus = { clock: string; open: boolean; label: string; detail: string };

function venueNow() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: SITE.timezone, weekday: "short", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { weekday, h: Number(get("hour")), m: Number(get("minute")), s: Number(get("second")) };
}

/** Open from 10PM on a residency night until 6AM next morning, in the venue's own time zone. */
export function venueStatus(): VenueStatus {
  const { weekday, h, m, s } = venueNow();
  const clock = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  const nightOn = (d: number) => NIGHTS.find((n) => n.day === ((d % 7) + 7) % 7);
  const tonight = h >= 22 ? nightOn(weekday) : h < 6 ? nightOn(weekday - 1) : null;
  if (tonight) return { clock, open: true, label: "Open now", detail: `${tonight.title} · until ${SITE.closes}` };

  // Minutes until the next 10PM opening.
  const nowMin = h * 60 + m + s / 60;
  for (let add = 0; add < 8; add++) {
    const n = nightOn(weekday + add);
    if (!n) continue;
    const until = add * 1440 + 22 * 60 - nowMin;
    if (until <= 0) continue;
    const hrs = Math.floor(until / 60);
    const mins = Math.floor(until % 60);
    const when = add === 0 ? "tonight" : add === 1 ? "tomorrow" : n.dayName;
    return {
      clock,
      open: false,
      label: until < 24 * 60 ? `Doors in ${hrs}h ${String(mins).padStart(2, "0")}m` : `Next: ${n.dayName}`,
      detail: `${n.title} · ${when} ${SITE.doorsOpen}`,
    };
  }
  return { clock, open: false, label: "Closed", detail: "" };
}

/** Small live pill: the venue's local time and whether it's open (rendered after mount, so no hydration mismatch). */
export function VenueStatusPill({ className }: { className?: string }) {
  const [s, setS] = useState<VenueStatus | null>(null);
  useEffect(() => {
    const tick = () => setS(venueStatus());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 15_000);
    return () => { clearTimeout(first); clearInterval(id); };
  }, []);
  if (!s) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 1.8 }} className={cx("flex items-center gap-3 rounded-full border border-white/10 bg-black/60 px-4 py-2 text-[10px] uppercase tracking-[0.25em]", className)}>
      <span className="relative flex h-2 w-2">
        {s.open && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />}
        <span className={cx("relative inline-flex h-2 w-2 rounded-full", s.open ? "bg-accent" : "bg-zinc-500")} />
      </span>
      <span className="font-mono text-white">{SITE.city} {s.clock}</span>
      <span className="text-zinc-400">{s.label}</span>
      <span className="hidden text-zinc-500 sm:inline">{s.detail}</span>
    </motion.div>
  );
}

// ─── Chapter rail ───────────────────────────────────────────────────────────

const CHAPTERS = [
  { id: "about", label: "About" },
  { id: "nights", label: "The Nights" },
  { id: "space", label: "The Space" },
  { id: "experience", label: "Experience" },
  { id: "menu", label: "Menu" },
  { id: "reserve", label: "Reserve" },
  { id: "events", label: "Events" },
  { id: "faq", label: "FAQs" },
];
const NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

/** Fixed index on the right edge (desktop): where you are, and a click to jump. */
export function ChapterRail() {
  const [active, setActive] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    const els = CHAPTERS.map((c) => document.getElementById(c.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    els.forEach((el) => io.observe(el));
    const onScroll = () => { if (window.scrollY < window.innerHeight * 1.2) setActive(null); };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { io.disconnect(); window.removeEventListener("scroll", onScroll); };
  }, []);

  return (
    <AnimatePresence>
      {active && (
        <motion.nav
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          aria-label="Sections"
          className="fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-end gap-3 xl:flex"
        >
          {CHAPTERS.map((c, i) => {
            const on = c.id === active;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => scrollToTarget(`#${c.id}`)}
                onMouseEnter={() => setHover(c.id)}
                onMouseLeave={() => setHover(null)}
                className="group flex items-center gap-3"
                aria-current={on ? "true" : undefined}
                data-cursor="Go"
              >
                <AnimatePresence>
                  {(hover === c.id || on) && (
                    <motion.span initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} className={cx("text-[10px] uppercase tracking-[0.3em]", on ? "text-white" : "text-zinc-400")}>
                      {c.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                <span className={cx("font-mono text-[10px] transition-colors", on ? "text-accent" : "text-zinc-600 group-hover:text-zinc-300")}>{NUMERALS[i]}</span>
                <motion.span animate={{ width: on ? 28 : 12 }} className={cx("h-px", on ? "bg-accent" : "bg-zinc-600")} />
              </button>
            );
          })}
        </motion.nav>
      )}
    </AnimatePresence>
  );
}

// ─── Text scramble ──────────────────────────────────────────────────────────

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:✦";

/** Letters shuffle through random glyphs and resolve left to right (on hover). */
export function useScramble(text: string) {
  const [out, setOut] = useState(text);
  const raf = useRef(0);
  const run = useCallback(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    cancelAnimationFrame(raf.current);
    const start = performance.now();
    const dur = 420;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const solved = Math.floor(p * text.length);
      setOut(text.split("").map((ch, i) => (i < solved || ch === " " ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)])).join(""));
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  }, [text]);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  return [out, run] as const;
}

export function ScrambleText({ text, className }: { text: string; className?: string }) {
  const [out, run] = useScramble(text);
  return (
    <span className={className} onMouseEnter={run} aria-label={text}>
      <span aria-hidden="true">{out}</span>
    </span>
  );
}

// ─── 11:11 wish moment ──────────────────────────────────────────────────────

/** If the visitor happens to be here at 11:11 (their own clock), the site notices. */
export function WishMoment() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let shown = false;
    const check = () => {
      const d = new Date();
      if (!shown && d.getMinutes() === 11 && d.getHours() % 12 === 11) {
        shown = true;
        setShow(true);
        for (let i = 0; i < 5; i++) setTimeout(() => window.dispatchEvent(new CustomEvent("portal:wish", { detail: { x: Math.random() * 2 - 1, y: Math.random() * 0.8 + 0.1 } })), i * 350);
        setTimeout(() => setShow(false), 9000);
      }
    };
    const first = setTimeout(check, 2500);
    const id = setInterval(check, 10_000);
    return () => { clearTimeout(first); clearInterval(id); };
  }, []);
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed left-1/2 top-24 z-[80] -translate-x-1/2 rounded-full border border-accent/60 bg-black/90 px-6 py-3 text-center"
          role="status"
        >
          <p className="font-display text-sm font-bold uppercase tracking-[0.3em] text-white">It&apos;s 11<span className="text-accent">:</span>11</p>
          <p className="mt-1 text-xs text-zinc-400">Close your eyes and make a wish ✦</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
