"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring } from "framer-motion";
import { Menu, X } from "lucide-react";
import { SITE } from "@/lib/site";
import { cx } from "../ui";
import { Magnetic } from "./motion";
import { ScrambleText } from "./extras";
import { getLenis } from "./smooth";

const LINKS = [
  { href: "#about", label: "About" },
  { href: "#nights", label: "The Nights" },
  { href: "#space", label: "The Space" },
  { href: "#experience", label: "Experience" },
  { href: "/menu", label: "Menu" },
  { href: "#events", label: "Events" },
  { href: "#faq", label: "FAQs" },
];

export function SiteLogo({ className }: { className?: string }) {
  return (
    <span className={cx("font-display text-base font-bold tracking-[0.2em] text-white", className)}>
      11<span className="text-accent">:</span>11
    </span>
  );
}

/** Transparent over the hero, solid once you scroll; hides while scrolling down and returns on the way up. */
export function SiteNav() {
  const { scrollY } = useScroll();
  const [solid, setSolid] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  // Section links point at the home page when you're on /menu or /events.
  const home = usePathname() === "/";
  const to = (href: string) => (href.startsWith("#") && !home ? `/${href}` : href);

  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setSolid(y > 40);
    setHidden(y > 400 && y > prev && !open);
  });

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    if (open) getLenis()?.stop();
    else getLenis()?.start();
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <motion.header
        animate={{ y: hidden ? -100 : 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className={cx("fixed inset-x-0 top-0 z-50 transition-colors duration-500", solid ? "border-b border-line bg-black/95 md:bg-black/85 md:backdrop-blur-md" : "border-b border-transparent")}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" aria-label={`${SITE.name} home`}><SiteLogo /></Link>
          <nav className="hidden items-center gap-7 lg:flex" aria-label="Main">
            {LINKS.map((l) => (
              <a key={l.href} href={to(l.href)} className="group relative text-[11px] font-medium uppercase tracking-[0.25em] text-zinc-300 transition-colors hover:text-white">
                <ScrambleText text={l.label} />
                <span className="absolute -bottom-1.5 left-0 h-px w-full origin-left scale-x-0 bg-accent transition-transform duration-300 group-hover:scale-x-100" />
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Magnetic className="hidden sm:inline-block">
              <a href={to("#reserve")} data-cursor="Book" className="inline-flex h-10 items-center rounded-full bg-accent px-5 text-[11px] font-bold uppercase tracking-[0.2em] text-black transition-colors hover:bg-accent-strong">
                Reserve a table
              </a>
            </Magnetic>
            <button type="button" onClick={() => setOpen(true)} className="rounded-full p-2.5 text-white lg:hidden" aria-label="Open menu">
              <Menu size={22} />
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[70] flex flex-col bg-black px-6 pb-10 pt-5"
            initial={{ clipPath: "circle(0% at 100% 0%)" }}
            animate={{ clipPath: "circle(150% at 100% 0%)" }}
            exit={{ clipPath: "circle(0% at 100% 0%)" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
          >
            <div className="flex items-center justify-between">
              <SiteLogo />
              <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2.5 text-white" aria-label="Close menu"><X size={24} /></button>
            </div>
            <nav className="mt-12 flex flex-1 flex-col gap-2" aria-label="Main">
              {[...LINKS, { href: "#reserve", label: "Reserve a table" }].map((l, i) => (
                <motion.a
                  key={l.href}
                  href={to(l.href)}
                  onClick={() => setOpen(false)}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className={cx("font-display text-2xl uppercase tracking-wider", l.href === "#reserve" ? "mt-6 text-accent" : "text-white")}
                >
                  {l.label}
                </motion.a>
              ))}
            </nav>
            <p className="text-xs uppercase tracking-[0.25em] text-muted">{SITE.address}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/** An accent ring that trails the mouse and swells over links and buttons. Hidden on touch screens. */
export function Cursor() {
  const x = useSpring(-100, { stiffness: 500, damping: 40, mass: 0.4 });
  const y = useSpring(-100, { stiffness: 500, damping: 40, mass: 0.4 });
  const [hover, setHover] = useState(false);
  const [label, setLabel] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine) return;
    const root = document.documentElement;
    root.classList.add("site-cursor-on");
    const move = (e: PointerEvent) => {
      setEnabled(true);
      x.set(e.clientX);
      y.set(e.clientY);
      const t = e.target as Element | null;
      setHover(!!t?.closest("a, button, [role='button'], label, select"));
      setLabel(t?.closest<HTMLElement>("[data-cursor]")?.dataset.cursor ?? null);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      root.classList.remove("site-cursor-on");
    };
  }, [x, y]);

  if (!enabled) return null;
  return (
    <>
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[100] flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-accent"
        style={{ x, y }}
        animate={{ width: label ? 84 : hover ? 56 : 30, height: label ? 84 : hover ? 56 : 30, opacity: hover || label ? 0.95 : 0.6, backgroundColor: label ? "rgba(200,64,224,0.92)" : "rgba(200,64,224,0)" }}
        transition={{ duration: 0.25 }}
      >
        <AnimatePresence>
          {label && (
            <motion.span key={label} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} className="text-[10px] font-bold uppercase tracking-[0.2em] text-black">
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
      {!label && <motion.div aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-[100] h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent" style={{ x, y }} />}
    </>
  );
}

/** First visit in a session: the clock counts up to 11:11, then the curtain lifts. */
export function Loader() {
  const [show, setShow] = useState(false);
  const [time, setTime] = useState("00:00");

  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem("1111-intro") === "1"; } catch {}
    if (seen || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    try { sessionStorage.setItem("1111-intro", "1"); } catch {}
    let start = 0;
    const total = 1400;
    let raf = 0;
    const tick = (now: number) => {
      if (!start) {
        start = now;
        setShow(true);
      }
      const p = Math.min(1, (now - start) / total);
      const e = 1 - Math.pow(1 - p, 3);
      const mins = Math.round(e * 671); // 11:11 = 671 minutes
      setTime(`${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setTimeout(() => setShow(false), 450);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-black"
          exit={{ y: "-100%" }}
          transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
          onClick={() => setShow(false)}
        >
          <p className="font-display text-5xl font-bold tabular-nums tracking-[0.15em] text-white sm:text-7xl">
            {time.slice(0, 2)}<span className="text-accent">:</span>{time.slice(3)}
          </p>
          <p className="mt-4 text-[10px] uppercase tracking-[0.5em] text-muted">{SITE.tagline}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
