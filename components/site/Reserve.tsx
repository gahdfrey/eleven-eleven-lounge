"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { ArrowRight, Minus, Plus } from "lucide-react";
import { api, isNetworkError, randomId } from "@/lib/client";
import { ARRIVAL_TIMES, OCCASIONS, SEATING_LABELS, SITE, formatArrival, formatNightDate, whatsappLink } from "@/lib/site";
import { cx } from "../ui";
import { RevealText } from "./motion";
import { Ticket, type TicketData } from "./Ticket";

const ClockScene = dynamic(() => import("./ClockScene"), { ssr: false });
const EASE = [0.22, 1, 0.36, 1] as const;

type NightOption = { date: string; title: string; dayName: string; day: number };
type Done = { reference: string; night: string; arrivalTime: string; partySize: number; name: string };

const fieldClass =
  "w-full border-0 border-b border-line bg-transparent px-0 py-3 text-lg text-white placeholder:text-zinc-600 focus:border-accent focus:outline-none focus:ring-0";

export function Reserve({ nights }: { nights: NightOption[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const progressRef = useRef(0);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "start 0.15"] });
  useMotionValueEvent(scrollYProgress, "change", (v) => { progressRef.current = v; });

  const [night, setNight] = useState(nights[0]?.date ?? "");
  const [time, setTime] = useState("22:30");
  const [party, setParty] = useState(2);
  const [seating, setSeating] = useState<keyof typeof SEATING_LABELS>("standard");
  const [occasion, setOccasion] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [ref, setRef] = useState<string | null>(null);
  const [name, setName] = useState("");
  // Once the guest starts choosing, the clock gives way to their live ticket.
  const touched = name !== "" || night !== (nights[0]?.date ?? "") || time !== "22:30" || party !== 2 || seating !== "standard" || occasion !== null;
  const titleFor = (d: string) => nights.find((n) => n.date === d)?.title ?? formatNightDate(d);
  const ticket: TicketData = { name, night, nightTitle: titleFor(night), time, party, seating, occasion };

  // "Book" on a night card picks that weekday's next date.
  useEffect(() => {
    const pick = (e: Event) => {
      const day = (e as CustomEvent<number>).detail;
      const match = nights.find((n) => n.day === day);
      if (match) setNight(match.date);
    };
    window.addEventListener("reserve:night", pick);
    return () => window.removeEventListener("reserve:night", pick);
  }, [nights]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setError("");
    if (!night) return setError("Choose a night.");
    setBusy(true);
    const attempt = ref ?? randomId();
    setRef(attempt);
    const body = {
      name: String(f.get("name") ?? ""),
      phone: String(f.get("phone") ?? ""),
      email: String(f.get("email") ?? ""),
      night,
      arrivalTime: time,
      partySize: party,
      seating,
      occasion: occasion ?? undefined,
      notes: String(f.get("notes") ?? "") || undefined,
      website: String(f.get("website") ?? "") || undefined,
      ref: attempt,
    };
    try {
      let res: Done | undefined;
      for (let i = 1; !res; i++) {
        try {
          res = await api<Done>("/api/public/reservations", { body });
        } catch (err) {
          if (isNetworkError(err) && i < 3) {
            await new Promise((r) => setTimeout(r, 800 * i));
            continue;
          }
          throw isNetworkError(err) ? new Error("Connection problem. Check your internet and try again. You won't be booked twice.") : err;
        }
      }
      setDone(res);
      setRef(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="reserve" ref={sectionRef} className="relative border-y border-line px-5 py-28 sm:px-8 sm:py-36">
      <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[1fr_1.15fr] lg:gap-20">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-5 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.45em] text-accent"><span className="h-px w-8 bg-accent" />Secure your spot</p>
          <RevealText as="h2" text="Reserve a table" className="font-display text-[2.1rem] min-[400px]:text-5xl font-bold uppercase leading-[1.05] text-white sm:text-6xl" />
          <p className="mt-6 max-w-md text-lg text-zinc-400">Arrive ready. Book ahead and your table and host are waiting when you walk in.</p>
          <div className="relative mx-auto mt-6 aspect-square w-full max-w-md lg:mt-10">
            <motion.div className="absolute inset-0" animate={{ opacity: touched || done ? 0.25 : 1, scale: touched || done ? 0.8 : 1, y: touched || done ? -40 : 0 }} transition={{ duration: 0.8, ease: EASE }}>
              <ClockScene progressRef={progressRef} />
            </motion.div>
            <AnimatePresence>
              {(touched || done) && (
                <motion.div className="absolute inset-x-0 bottom-[14%] hidden lg:block" initial={{ opacity: 0, y: 40, rotateX: -40 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} exit={{ opacity: 0, y: 30 }} transition={{ duration: 0.8, ease: EASE }}>
                  <Ticket t={done ? { ...ticket, name: done.name, night: done.night, nightTitle: titleFor(done.night), time: done.arrivalTime, party: done.partySize, code: done.reference } : ticket} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="relative min-w-0">
          <AnimatePresence mode="wait">
            {done ? (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, ease: EASE }} className="rounded-3xl border border-accent/40 bg-surface p-8 sm:p-12">
                <svg viewBox="0 0 52 52" className="h-16 w-16" aria-hidden="true">
                  <motion.circle cx="26" cy="26" r="24" fill="none" stroke="#c840e0" strokeWidth="2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, ease: EASE }} />
                  <motion.path d="M15 27 l7 7 l15 -16" fill="none" stroke="#c840e0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.6, ease: EASE }} />
                </svg>
                <h3 className="mt-8 font-display text-3xl font-bold uppercase text-white">Request received</h3>
                <p className="mt-4 text-zinc-400">
                  Thank you, {done.name.split(" ")[0]}. We&apos;ll call or WhatsApp you to confirm your table for {done.partySize} on{" "}
                  <span className="text-white">{formatNightDate(done.night, { weekday: "long", day: "numeric", month: "long" })}</span> at{" "}
                  <span className="text-white">{formatArrival(done.arrivalTime)}</span>.
                </p>
                <div className="mt-8 rounded-2xl border border-line bg-black p-6 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-muted">Your reservation code</p>
                  <p className="mt-3 font-display text-4xl font-bold tracking-[0.2em] text-accent">{done.reference}</p>
                  <p className="mt-3 text-xs text-muted">Quote it at the door. A screenshot of your ticket works too.</p>
                </div>
                <Ticket className="mt-6 lg:hidden" t={{ ...ticket, name: done.name, night: done.night, nightTitle: titleFor(done.night), time: done.arrivalTime, party: done.partySize, code: done.reference }} />
                <div className="mt-8 flex flex-wrap gap-3">
                  <a
                    href={whatsappLink(`Hi ${SITE.name}, I just booked a table. My reservation code is ${done.reference}.`)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-12 items-center rounded-full bg-accent px-6 text-xs font-bold uppercase tracking-[0.2em] text-black hover:bg-accent-strong"
                  >
                    Message us on WhatsApp
                  </a>
                  <button type="button" onClick={() => { setDone(null); setName(""); }} className="inline-flex h-12 items-center rounded-full border border-white/20 px-6 text-xs font-bold uppercase tracking-[0.2em] text-white hover:border-accent">
                    Book another
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.form key="form" onSubmit={submit} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }} className="flex min-w-0 flex-col gap-12" noValidate>
                <Step n="01" title="Choose your night">
                  <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:px-0">
                    {nights.map((n) => (
                      <Chip key={n.date} active={night === n.date} onClick={() => setNight(n.date)} className="min-w-[8.5rem] flex-col items-start py-3 text-left sm:min-w-0">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.25em] opacity-70">{formatNightDate(n.date, { weekday: "short", day: "numeric", month: "short" })}</span>
                        <span className="mt-1 text-sm font-semibold normal-case tracking-normal">{n.title}</span>
                      </Chip>
                    ))}
                  </div>
                </Step>

                <Step n="02" title="Arrival time">
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {ARRIVAL_TIMES.map((t) => (
                      <Chip key={t} active={time === t} onClick={() => setTime(t)} className="justify-center">{formatArrival(t)}</Chip>
                    ))}
                  </div>
                </Step>

                <Step n="03" title="Your party">
                  <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-4 rounded-full border border-line px-2 py-2">
                      <button type="button" onClick={() => setParty((p) => Math.max(1, p - 1))} className="rounded-full p-2 text-zinc-300 hover:bg-raised hover:text-white" aria-label="Fewer guests"><Minus size={16} /></button>
                      <div className="relative h-9 w-10 overflow-hidden text-center">
                        <AnimatePresence mode="popLayout" initial={false}>
                          <motion.span key={party} initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -24, opacity: 0 }} transition={{ duration: 0.25 }} className="absolute inset-0 font-display text-2xl font-bold leading-9 text-white">{party}</motion.span>
                        </AnimatePresence>
                      </div>
                      <button type="button" onClick={() => setParty((p) => Math.min(30, p + 1))} className="rounded-full p-2 text-zinc-300 hover:bg-raised hover:text-white" aria-label="More guests"><Plus size={16} /></button>
                    </div>
                    <span className="text-sm text-muted">guest{party === 1 ? "" : "s"} · up to 30 online</span>
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {(Object.keys(SEATING_LABELS) as (keyof typeof SEATING_LABELS)[]).map((k) => (
                      <Chip key={k} active={seating === k} onClick={() => setSeating(k)} className="justify-center">{SEATING_LABELS[k]}</Chip>
                    ))}
                  </div>
                </Step>

                <Step n="04" title="Your details">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <label className="block"><span className="sr-only">Full name</span><input name="name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={80} autoComplete="name" placeholder="Full name" className={fieldClass} /></label>
                    <label className="block"><span className="sr-only">Phone or WhatsApp</span><input name="phone" required type="tel" maxLength={20} autoComplete="tel" placeholder="Phone / WhatsApp" className={fieldClass} /></label>
                    <label className="block sm:col-span-2"><span className="sr-only">Email (optional)</span><input name="email" type="email" maxLength={120} autoComplete="email" placeholder="Email (optional)" className={fieldClass} /></label>
                  </div>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {OCCASIONS.map((o) => (
                      <Chip key={o} active={occasion === o} onClick={() => setOccasion(occasion === o ? null : o)} small>{o}</Chip>
                    ))}
                  </div>
                  <label className="mt-6 block"><span className="sr-only">Anything we should know?</span><textarea name="notes" maxLength={500} rows={2} placeholder="Anything we should know? (bottle on arrival, birthday surprise…)" className={cx(fieldClass, "resize-none")} /></label>
                  {/* Honeypot: hidden from people, irresistible to bots. */}
                  <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
                </Step>

                <Ticket className="lg:hidden" t={ticket} />

                {error && <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300" role="alert">{error}</motion.p>}

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted">Guests must be {SITE.minAge}+. We confirm every booking by phone or WhatsApp.</p>
                  <motion.button whileHover={{ scale: busy ? 1 : 1.03 }} whileTap={{ scale: 0.97 }} disabled={busy} className="inline-flex h-14 items-center justify-center gap-3 rounded-full bg-accent px-8 text-xs font-bold uppercase tracking-[0.25em] text-black hover:bg-accent-strong disabled:opacity-60">
                    {busy ? "Sending…" : <>Request table <ArrowRight size={16} /></>}
                  </motion.button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <motion.fieldset className="min-w-0" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "0px 0px -10% 0px" }} transition={{ duration: 0.8, ease: EASE }}>
      <legend className="mb-5 flex items-center gap-4">
        <span className="font-mono text-xs text-accent">{n}</span>
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white">{title}</span>
      </legend>
      {children}
    </motion.fieldset>
  );
}

function Chip({ active, onClick, children, className, small }: { active: boolean; onClick: () => void; children: React.ReactNode; className?: string; small?: boolean }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      whileTap={{ scale: 0.95 }}
      className={cx(
        "relative flex shrink-0 items-center rounded-xl border px-3 text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors duration-300",
        small ? "rounded-full py-2" : "py-3",
        active ? "border-accent bg-accent text-black" : "border-line text-zinc-300 hover:border-zinc-500 hover:text-white",
        className,
      )}
    >
      {children}
    </motion.button>
  );
}
