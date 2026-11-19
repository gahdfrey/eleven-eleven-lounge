"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, ArrowUpRight, AtSign, MapPin, MessageCircle, Phone, Plus } from "lucide-react";
import { EXPERIENCE, FAQS, NIGHTS, SITE, formatNightDate, whatsappLink } from "@/lib/site";
import { formatNaira } from "@/lib/money";
import type { MenuCategory } from "@/lib/menu";
import { cx } from "../ui";
import { Counter, FadeUp, Magnetic, Marquee, RevealText, TiltCard } from "./motion";
import { SiteLogo } from "./SiteChrome";

const EASE = [0.22, 1, 0.36, 1] as const;

function Kicker({ children }: { children: React.ReactNode }) {
  return <p className="mb-5 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.45em] text-accent"><span className="h-px w-8 bg-accent" />{children}</p>;
}

/** Asks the booking form to pick the next date for a weekday (from "Book this night"). */
export function chooseNight(day: number) {
  window.dispatchEvent(new CustomEvent("reserve:night", { detail: day }));
}

// ─── About ──────────────────────────────────────────────────────────────────

export function About() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const ringY = useTransform(scrollYProgress, [0, 1], [120, -120]);
  const ringRotate = useTransform(scrollYProgress, [0, 1], [0, 140]);

  const stats = [
    { value: <Counter to={NIGHTS.length} />, label: "Nights a week" },
    { value: <Counter to={SITE.minAge} suffix="+" />, label: "Age requirement" },
    { value: <><Counter to={10} />PM</>, label: "Doors open" },
    { value: "∞", label: "The time of your life" },
  ];

  return (
    <section id="about" ref={ref} className="relative overflow-hidden px-5 py-28 sm:px-8 sm:py-40">
      {/* Decorative orbit rings drifting with the scroll. */}
      <motion.div aria-hidden="true" style={{ y: ringY, rotate: ringRotate }} className="pointer-events-none absolute -right-40 top-10 h-[34rem] w-[34rem] rounded-full border border-accent/20">
        <span className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent" />
        <span className="absolute inset-16 rounded-full border border-white/5" />
      </motion.div>

      <div className="relative mx-auto grid max-w-7xl gap-16 lg:grid-cols-[1.2fr_1fr] lg:gap-24">
        <div>
          <Kicker>Where {SITE.city} comes alive</Kicker>
          <RevealText as="h2" text="Not just a night out." className="font-display text-4xl font-bold uppercase leading-[1.1] text-white sm:text-6xl" />
          <FadeUp delay={0.2} className="mt-10 max-w-xl space-y-5 text-lg leading-relaxed text-zinc-400">
            <p>
              <span className="text-white">11:11 is the minute people stop and make a wish.</span> We built a room around that feeling: a place where
              the night slows down, the lights go celestial, and the music carries you somewhere else entirely.
            </p>
            <p>
              Luxury without the stiffness, rhythm without the rush. Walk in, leave the ordinary at the door, and let the night take its time.
            </p>
          </FadeUp>
        </div>
        <div className="grid grid-cols-2 gap-px self-end overflow-hidden rounded-2xl border border-line bg-line">
          {stats.map((s, i) => (
            <FadeUp key={s.label} delay={0.1 * i} y={20} className="bg-black p-6 sm:p-8">
              <p className="font-display text-3xl font-bold text-accent sm:text-4xl">{s.value}</p>
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-muted">{s.label}</p>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── The Nights (horizontal scroll on desktop) ──────────────────────────────

export function Nights({ next }: { next: Record<number, string> }) {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0, 1], [0, -distance]);

  useEffect(() => {
    const measure = () => {
      const t = trackRef.current;
      setDistance(t && window.innerWidth >= 1024 ? Math.max(0, t.scrollWidth - window.innerWidth + 64) : 0);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const cards = NIGHTS.map((n, i) => (
    <motion.article
      key={n.day}
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.9, ease: EASE, delay: i * 0.08 }}
      className="group relative flex min-h-[26rem] w-full shrink-0 flex-col justify-between overflow-hidden rounded-3xl border border-line bg-surface p-8 transition-colors duration-500 hover:border-accent/60 lg:h-[min(32rem,calc(100vh-17rem))] lg:min-h-[22rem] lg:w-[26rem]"
    >
      <span aria-hidden="true" className="pointer-events-none absolute -right-4 -top-10 font-display text-[11rem] font-bold leading-none text-transparent transition-transform duration-700 [-webkit-text-stroke:1px_rgba(212,168,75,0.35)] group-hover:-translate-y-3 group-hover:scale-105">
        {n.numeral}
      </span>
      <div className="relative">
        <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-accent">{n.dayName}</p>
        <h3 className="mt-4 font-display text-3xl font-bold uppercase leading-tight text-white">{n.title}</h3>
        <p className="mt-5 max-w-xs leading-relaxed text-zinc-400">{n.blurb}</p>
      </div>
      <div className="relative flex items-end justify-between gap-4 border-t border-line pt-5">
        <div>
          <p className="font-mono text-sm text-white">{n.hours}</p>
          {next[n.day] && <p className="mt-1 text-xs text-muted">Next: {formatNightDate(next[n.day])}</p>}
        </div>
        <a href="#reserve" onClick={() => chooseNight(n.day)} className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white transition-colors hover:border-accent hover:bg-accent hover:text-black">
          Book <ArrowRight size={13} />
        </a>
      </div>
    </motion.article>
  ));

  return (
    <section id="nights" ref={sectionRef} className="relative lg:h-[260vh]" aria-label="The nights">
      <div className="lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:justify-center lg:overflow-hidden">
        <div className="mx-auto w-full max-w-7xl px-5 pb-10 pt-24 sm:px-8 lg:pt-16">
          <Kicker>Weekly residencies</Kicker>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <RevealText as="h2" text="The nights" className="font-display text-[2.1rem] min-[400px]:text-5xl font-bold uppercase text-white sm:text-7xl" />
            <p className="max-w-sm text-zinc-400">Four nights, four moods. Every one runs from {SITE.doorsOpen} until {SITE.closes}.</p>
          </div>
        </div>
        <motion.div ref={trackRef} style={{ x }} className="flex flex-col gap-5 px-5 pb-24 sm:px-8 lg:flex-row lg:pb-0 lg:pl-[max(2rem,calc((100vw-80rem)/2+2rem))]">
          {cards}
          <div className="hidden w-[26rem] shrink-0 flex-col justify-center rounded-3xl border border-dashed border-line p-8 lg:flex">
            <p className="font-display text-2xl font-bold uppercase leading-tight text-white">Your table is waiting</p>
            <p className="mt-4 text-zinc-400">Reserve ahead and arrive to a set table with a host for the night.</p>
            <Magnetic className="mt-8 self-start">
              <a href="#reserve" className="inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 text-xs font-bold uppercase tracking-[0.2em] text-black">Reserve <ArrowRight size={14} /></a>
            </Magnetic>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Experience ─────────────────────────────────────────────────────────────

export function Experience() {
  return (
    <section id="experience" className="px-5 py-28 sm:px-8 sm:py-40">
      <div className="mx-auto max-w-7xl">
        <Kicker>What awaits</Kicker>
        <div className="mb-16 grid gap-8 lg:grid-cols-2 lg:items-end">
          <RevealText as="h2" text="The experience" className="font-display text-[2.1rem] min-[400px]:text-5xl font-bold uppercase text-white sm:text-7xl" />
          <FadeUp className="max-w-lg text-lg text-zinc-400 lg:justify-self-end">
            Nothing here happens by accident. The sound, the light and the service are all tuned so the night stays with you after the last song.
          </FadeUp>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {EXPERIENCE.map((e, i) => (
            <FadeUp key={e.n} delay={i * 0.12} className="h-full">
              <TiltCard className="h-full">
                <div className="flex h-full min-h-[22rem] flex-col justify-between p-8">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm text-accent">{e.n}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-muted">{e.kicker}</span>
                  </div>
                  <div>
                    <h3 className="font-display text-2xl font-bold uppercase text-white">{e.title}</h3>
                    <p className="mt-4 leading-relaxed text-zinc-400">{e.body}</p>
                  </div>
                </div>
              </TiltCard>
            </FadeUp>
          ))}
        </div>
      </div>
      <Marquee
        className="mt-28 border-y border-line py-6 font-display text-2xl font-bold uppercase text-white sm:text-4xl"
        items={["Afrobeats", "Amapiano", "Hip-Hop", "Top 40", "Table service", "Celestial lighting", "Doors 10PM"]}
      />
    </section>
  );
}

// ─── Menu teaser (live from the app's menu) ─────────────────────────────────

export function MenuTeaser({ menu }: { menu: MenuCategory[] }) {
  const [active, setActive] = useState(0);
  const cats = menu.filter((c) => c.items.some((i) => !i.soldOut)).slice(0, 6);
  if (cats.length === 0) return null;
  const current = cats[Math.min(active, cats.length - 1)];
  return (
    <section id="menu" className="px-5 py-28 sm:px-8 sm:py-36">
      <div className="mx-auto max-w-7xl">
        <Kicker>From the bar</Kicker>
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <RevealText as="h2" text="On the menu" className="font-display text-[2.1rem] min-[400px]:text-5xl font-bold uppercase text-white sm:text-7xl" />
          <Link href="/menu" className="group inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-accent">
            Full menu <ArrowUpRight size={16} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>
        <div className="grid gap-10 lg:grid-cols-[16rem_1fr]">
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 lg:mx-0 lg:flex-col lg:px-0" role="tablist" aria-label="Menu categories">
            {cats.map((c, i) => (
              <button
                key={c.id ?? "other"}
                type="button"
                role="tab"
                aria-selected={i === active}
                onClick={() => setActive(i)}
                className={cx(
                  "shrink-0 rounded-full border px-4 py-2 text-left text-xs font-semibold uppercase tracking-[0.2em] transition-colors lg:rounded-none lg:border-0 lg:border-l-2 lg:px-5 lg:py-3",
                  i === active ? "border-accent text-white" : "border-line text-zinc-500 hover:text-white",
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.ul
              key={current.id ?? "other"}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.45, ease: EASE }}
              className="divide-y divide-line border-y border-line"
            >
              {current.items.filter((i) => !i.soldOut).slice(0, 7).map((item) => (
                <li key={item.id} className="group flex items-baseline justify-between gap-6 py-5">
                  <div className="min-w-0">
                    <p className="text-lg text-white transition-transform duration-300 group-hover:translate-x-2">{item.name}</p>
                    {item.description && <p className="mt-1 text-sm text-muted">{item.description}</p>}
                  </div>
                  <span className="hidden flex-1 border-b border-dotted border-line sm:block" />
                  <p className="shrink-0 font-mono text-accent">{formatNaira(item.price)}</p>
                </li>
              ))}
            </motion.ul>
          </AnimatePresence>
        </div>
        <p className="mt-8 text-sm text-muted">At the lounge? Scan the QR code on your table to order straight from your phone.</p>
      </div>
    </section>
  );
}

// ─── Events (live from the app) ─────────────────────────────────────────────

type EventItem = { id: number; title: string; description: string | null; startsAt: string; entry: string | null };

export function Events({ events }: { events: EventItem[] }) {
  return (
    <section id="events" className="px-5 py-28 sm:px-8 sm:py-36">
      <div className="mx-auto max-w-7xl">
        <Kicker>Coming up</Kicker>
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <RevealText as="h2" text="Special events" className="font-display text-[2.1rem] min-[400px]:text-5xl font-bold uppercase text-white sm:text-7xl" />
          <Link href="/events" className="group inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-accent">
            All events <ArrowUpRight size={16} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>
        {events.length === 0 ? (
          <FadeUp className="rounded-3xl border border-line p-10 text-center">
            <p className="font-display text-xl uppercase text-white">New dates are on the way</p>
            <p className="mt-3 text-zinc-400">
              Follow <a className="text-accent hover:underline" href={`https://instagram.com/${SITE.instagram}`} target="_blank" rel="noreferrer">@{SITE.instagram}</a> to hear first.
            </p>
          </FadeUp>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {events.map((e, i) => {
              const d = new Date(e.startsAt);
              const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { ...o, timeZone: "Africa/Lagos" }).format(d);
              return (
                <motion.li
                  key={e.id}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, ease: EASE, delay: i * 0.08 }}
                  className="group grid gap-4 py-8 sm:grid-cols-[8rem_1fr_auto] sm:items-center"
                >
                  <div className="flex items-baseline gap-3 sm:block">
                    <p className="font-display text-4xl font-bold text-accent">{fmt({ day: "2-digit" })}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted">{fmt({ month: "short", weekday: "short" })}</p>
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold uppercase text-white transition-colors group-hover:text-accent sm:text-2xl">{e.title}</h3>
                    {e.description && <p className="mt-2 line-clamp-2 max-w-2xl text-zinc-400">{e.description}</p>}
                  </div>
                  <p className="font-mono text-sm text-zinc-300">{fmt({ hour: "numeric", minute: "2-digit" })}{e.entry && <span className="block text-xs text-muted">{e.entry}</span>}</p>
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

// ─── FAQ ────────────────────────────────────────────────────────────────────

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="px-5 py-28 sm:px-8 sm:py-36">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <Kicker>Good to know</Kicker>
          <RevealText as="h2" text="Questions" className="font-display text-[2.1rem] min-[400px]:text-5xl font-bold uppercase text-white sm:text-6xl" />
          <p className="mt-6 max-w-sm text-zinc-400">
            Anything else? <a href={whatsappLink()} target="_blank" rel="noreferrer" className="text-accent hover:underline">Message us on WhatsApp</a>.
          </p>
        </div>
        <ul className="border-t border-line">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <li key={f.q} className="border-b border-line">
                <button type="button" onClick={() => setOpen(isOpen ? null : i)} aria-expanded={isOpen} className="flex w-full items-center justify-between gap-6 py-6 text-left">
                  <span className={cx("text-lg transition-colors", isOpen ? "text-white" : "text-zinc-300")}>{f.q}</span>
                  <motion.span animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.3 }} className={cx("shrink-0 rounded-full border p-1.5", isOpen ? "border-accent text-accent" : "border-line text-zinc-400")}>
                    <Plus size={16} />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease: EASE }} className="overflow-hidden">
                      <p className="max-w-2xl pb-6 leading-relaxed text-zinc-400">{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

// ─── Footer ─────────────────────────────────────────────────────────────────

export function SiteFooter({ year }: { year: number }) {
  return (
    <footer className="overflow-hidden border-t border-line px-5 pt-20 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 md:grid-cols-3">
          <div>
            <SiteLogo className="text-2xl" />
            <p className="mt-4 max-w-xs text-sm text-zinc-400">{SITE.tagline}. Thursday to Sunday, {SITE.doorsOpen} until {SITE.closes}. Strictly {SITE.minAge}+.</p>
          </div>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-3 text-zinc-300"><MapPin size={16} className="mt-0.5 shrink-0 text-accent" />{SITE.address}, {SITE.city}</li>
            <li><a href={`tel:${SITE.phone.replace(/\s/g, "")}`} className="flex items-center gap-3 text-zinc-300 hover:text-white"><Phone size={16} className="text-accent" />{SITE.phone}</a></li>
            <li><a href={whatsappLink()} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-zinc-300 hover:text-white"><MessageCircle size={16} className="text-accent" />WhatsApp us</a></li>
            <li><a href={`https://instagram.com/${SITE.instagram}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-zinc-300 hover:text-white"><AtSign size={16} className="text-accent" />@{SITE.instagram}</a></li>
          </ul>
          <div className="space-y-3 text-sm">
            <a href="#reserve" className="block text-zinc-300 hover:text-white">Reserve a table</a>
            <Link href="/menu" className="block text-zinc-300 hover:text-white">Menu</Link>
            <Link href="/events" className="block text-zinc-300 hover:text-white">Events</Link>
            <p className="flex flex-wrap gap-x-3 gap-y-1 pt-2 text-xs text-muted">{SITE.hashtags.map((h) => <span key={h}>{h}</span>)}</p>
          </div>
        </div>
        <p aria-hidden="true" className="mt-16 select-none text-center font-display text-[24vw] font-bold leading-[0.8] text-transparent [-webkit-text-stroke:1px_rgba(212,168,75,0.35)] lg:text-[18rem]">11:11</p>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-6 text-xs text-muted">
          <p>© {year} {SITE.fullName}</p>
          <Link href="/login" className="hover:text-white">Staff login</Link>
        </div>
      </div>
    </footer>
  );
}
