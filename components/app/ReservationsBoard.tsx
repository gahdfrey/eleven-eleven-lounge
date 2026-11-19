"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, ChevronDown, MessageCircle, Phone, Users } from "lucide-react";
import type { Reservation, ReservationStatus } from "@/lib/db/schema";
import { api, randomId } from "@/lib/client";
import { formatDateTime } from "@/lib/dates";
import { ARRIVAL_TIMES, OCCASIONS, SEATING_LABELS, SITE, formatArrival, formatNightDate, nightFor, whatsappNumber } from "@/lib/site";
import { Modal } from "../Modal";
import { Badge, Button, EmptyState, Field, Input, Select, Textarea, cx, type Tone } from "../ui";

type Row = Omit<Reservation, "createdAt" | "updatedAt"> & { createdAt: string; updatedAt: string; tableName: string | null; handledBy: string | null };
type Table = { id: number; name: string };

const STATUS: Record<ReservationStatus, [Tone, string]> = {
  pending: ["warning", "Needs confirming"],
  confirmed: ["info", "Confirmed"],
  seated: ["success", "Seated"],
  completed: ["neutral", "Completed"],
  cancelled: ["neutral", "Cancelled"],
  no_show: ["danger", "No-show"],
};

/** Bookings grouped by night, each with the actions that make sense for its status. */
export function ReservationsBoard({ rows, tables, tonight }: { rows: Row[]; tables: Table[]; tonight: string }) {
  if (rows.length === 0) {
    return <EmptyState title="No reservations here" description="Website bookings appear here the moment they're sent. Phone bookings can be added with “New reservation”." />;
  }
  const nights = [...new Set(rows.map((r) => r.night))];
  return (
    <div className="flex flex-col gap-8">
      {nights.map((night) => {
        const list = rows.filter((r) => r.night === night);
        const active = list.filter((r) => ["pending", "confirmed", "seated"].includes(r.status));
        const guests = active.reduce((n, r) => n + r.partySize, 0);
        const theme = nightFor(night);
        return (
          <section key={night}>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-2">
              <h2 className="flex items-center gap-2 font-semibold text-white">
                {formatNightDate(night, { weekday: "long", day: "numeric", month: "short" })}
                {night === tonight && <Badge tone="accent">Tonight</Badge>}
                {theme && <span className="text-sm font-normal text-muted">· {theme.title}</span>}
              </h2>
              <p className="text-xs text-muted">{active.length} booking{active.length === 1 ? "" : "s"} · {guests} guest{guests === 1 ? "" : "s"}</p>
            </div>
            <ul className="flex flex-col gap-2">
              {list.map((r) => <ReservationCard key={r.id} r={r} tables={tables} />)}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function ReservationCard({ r, tables }: { r: Row; tables: Table[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(r.status === "pending");
  const [note, setNote] = useState(r.staffNote ?? "");
  const [tone, label] = STATUS[r.status];
  const done = ["completed", "cancelled", "no_show"].includes(r.status);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      await api(`/api/reservations/${r.id}`, { method: "PATCH", body });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const confirmText = `Hi ${r.name.split(" ")[0]}, your table at ${SITE.name} for ${r.partySize} on ${formatNightDate(r.night, { weekday: "long", day: "numeric", month: "long" })} at ${formatArrival(r.arrivalTime)} is confirmed. Your reservation code is ${r.reference}. See you then!`;

  return (
    <li className={cx("rounded-xl border bg-surface", r.status === "pending" ? "border-amber-900/70" : "border-line", done && "opacity-60")}>
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3 p-4">
        <div className="w-20 shrink-0">
          <p className="text-lg font-semibold tabular-nums text-white">{formatArrival(r.arrivalTime).replace(" ", " ")}</p>
          <p className="font-mono text-xs text-accent">{r.reference}</p>
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-medium text-white">
            {r.name}
            <Badge tone={tone}>{label}</Badge>
            {r.source === "staff" && <span className="text-xs font-normal text-muted">by phone</span>}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-400">
            <span className="flex items-center gap-1"><Users size={14} /> {r.partySize}</span>
            <span>{SEATING_LABELS[r.seating]}</span>
            {r.occasion && <span className="text-accent">{r.occasion}</span>}
            {r.tableName && <span className="text-white">Table: {r.tableName}</span>}
          </p>
          {r.notes && <p className="mt-1.5 text-sm text-zinc-300">“{r.notes}”</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <a href={`tel:${r.phone.replace(/\s/g, "")}`} className="rounded-lg border border-line p-2 text-zinc-300 hover:text-white" aria-label={`Call ${r.name}`} title={r.phone}><Phone size={15} /></a>
          <a href={`https://wa.me/${whatsappNumber(r.phone)}?text=${encodeURIComponent(confirmText)}`} target="_blank" rel="noreferrer" className="rounded-lg border border-line p-2 text-zinc-300 hover:text-white" aria-label={`WhatsApp ${r.name}`} title="Send confirmation on WhatsApp"><MessageCircle size={15} /></a>
          <button type="button" onClick={() => setOpen(!open)} className="rounded-lg border border-line p-2 text-zinc-300 hover:text-white" aria-expanded={open} aria-label="Details">
            <ChevronDown size={15} className={cx("transition-transform", open && "rotate-180")} />
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-line px-4 py-3 text-sm">
          <dl className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
            <div><dt className="text-muted">Phone</dt><dd className="text-zinc-200">{r.phone}</dd></div>
            <div><dt className="text-muted">Email</dt><dd className="truncate text-zinc-200">{r.email ?? "—"}</dd></div>
            <div><dt className="text-muted">Booked</dt><dd className="text-zinc-200">{formatDateTime(r.createdAt)}</dd></div>
            <div><dt className="text-muted">Handled by</dt><dd className="text-zinc-200">{r.handledBy ?? "—"}</dd></div>
          </dl>
          <div className="flex flex-wrap items-end gap-2">
            {!done && (
              <label className="w-40">
                <span className="mb-1 block text-xs text-muted">Table</span>
                <Select value={r.tableId ?? ""} disabled={busy} onChange={(e) => patch({ tableId: e.target.value ? Number(e.target.value) : null })} className="h-9">
                  <option value="">Not assigned</option>
                  {tables.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </Select>
              </label>
            )}
            <label className="min-w-[200px] flex-1">
              <span className="mb-1 block text-xs text-muted">Staff note (guests never see this)</span>
              <div className="flex gap-2">
                <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="e.g. Called, confirmed. Wants bottle on arrival." className="h-9" />
                {note !== (r.staffNote ?? "") && <Button size="sm" variant="secondary" disabled={busy} onClick={() => patch({ staffNote: note || null })}>Save</Button>}
              </div>
            </label>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
        {r.status === "pending" && <Button size="sm" disabled={busy} onClick={() => patch({ status: "confirmed" })}>Confirm</Button>}
        {(r.status === "pending" || r.status === "confirmed") && <Button size="sm" variant={r.status === "confirmed" ? "primary" : "secondary"} disabled={busy} onClick={() => patch({ status: "seated" })}>Seat now</Button>}
        {r.status === "seated" && <Button size="sm" disabled={busy} onClick={() => patch({ status: "completed" })}>Mark completed</Button>}
        {r.status === "confirmed" && <Button size="sm" variant="secondary" disabled={busy} onClick={() => patch({ status: "no_show" })}>No-show</Button>}
        {(r.status === "pending" || r.status === "confirmed") && (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => confirm(`Cancel ${r.name}'s reservation?`) && patch({ status: "cancelled" })}>Cancel booking</Button>
        )}
        {done && <Button size="sm" variant="secondary" disabled={busy} onClick={() => patch({ status: "confirmed" })}>Reopen</Button>}
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </li>
  );
}

/** Staff enter a booking taken by phone, WhatsApp or at the door. */
export function NewReservationButton({ tonight }: { tonight: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ref, setRef] = useState(randomId);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await api("/api/reservations", {
        body: {
          name: String(f.get("name")),
          phone: String(f.get("phone")),
          email: String(f.get("email") ?? ""),
          night: String(f.get("night")),
          arrivalTime: String(f.get("arrivalTime")),
          partySize: Number(f.get("partySize")),
          seating: String(f.get("seating")),
          occasion: String(f.get("occasion") || "") || undefined,
          notes: String(f.get("notes") || "") || undefined,
          ref,
        },
      });
      setOpen(false);
      setRef(randomId());
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}><CalendarPlus size={16} /> New reservation</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="New reservation">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Guest name"><Input name="name" required minLength={2} maxLength={80} autoFocus /></Field>
            <Field label="Phone"><Input name="phone" type="tel" required maxLength={20} /></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Night"><Input name="night" type="date" required defaultValue={tonight} min={tonight} /></Field>
            <Field label="Arrival">
              <Select name="arrivalTime" defaultValue="22:30">{ARRIVAL_TIMES.map((t) => <option key={t} value={t}>{formatArrival(t)}</option>)}</Select>
            </Field>
            <Field label="Guests"><Input name="partySize" type="number" min={1} max={200} defaultValue={2} required /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Seating">
              <Select name="seating" defaultValue="standard">{Object.entries(SEATING_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
            </Field>
            <Field label="Occasion">
              <Select name="occasion" defaultValue=""><option value="">None</option>{OCCASIONS.map((o) => <option key={o}>{o}</option>)}</Select>
            </Field>
          </div>
          <Field label="Email (optional)"><Input name="email" type="email" maxLength={120} /></Field>
          <Field label="Notes (optional)"><Textarea name="notes" maxLength={500} placeholder="Requests, bottle pre-orders…" /></Field>
          {error && <p className="rounded-lg border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>}
          <Button size="lg" disabled={busy}>{busy ? "Saving…" : "Save reservation"}</Button>
          <p className="-mt-2 text-center text-xs text-muted">Phone bookings are saved as confirmed.</p>
        </form>
      </Modal>
    </>
  );
}
