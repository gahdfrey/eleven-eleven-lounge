import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { loungeTables, type ReservationStatus } from "@/lib/db/schema";
import { requirePageUser, SERVICE } from "@/lib/authz";
import { currentNight } from "@/lib/dates";
import { listReservations, reservationCounts } from "@/lib/reservations";
import { formatNightDate } from "@/lib/site";
import { Input, PageHeader, Stat, Button, cx } from "@/components/ui";
import { ReservationsBoard, NewReservationButton } from "@/components/app/ReservationsBoard";

export const metadata: Metadata = { title: "Reservations" };

const VIEWS = {
  upcoming: { label: "Upcoming", statuses: ["pending", "confirmed", "seated"] },
  tonight: { label: "Tonight", statuses: [] },
  pending: { label: "Needs confirming", statuses: ["pending"] },
  past: { label: "Past", statuses: [] },
} satisfies Record<string, { label: string; statuses: ReservationStatus[] }>;
type View = keyof typeof VIEWS;

const shift = (d: string, n: number) => {
  const x = new Date(`${d}T12:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};

export default async function ReservationsPage({ searchParams }: { searchParams: Promise<{ view?: string; night?: string }> }) {
  await requirePageUser(SERVICE);
  const sp = await searchParams;
  const tonight = currentNight();
  const night = sp.night && /^\d{4}-\d{2}-\d{2}$/.test(sp.night) ? sp.night : null;
  const view: View = night ? "upcoming" : sp.view && sp.view in VIEWS ? (sp.view as View) : "upcoming";

  const range = night
    ? { from: night, to: night }
    : view === "tonight"
      ? { from: tonight, to: tonight }
      : view === "past"
        ? { from: shift(tonight, -60), to: shift(tonight, -1) }
        : { from: tonight, to: shift(tonight, 365) };

  const [rows, counts, tables] = await Promise.all([
    listReservations({ ...range, statuses: night ? undefined : VIEWS[view].statuses }),
    reservationCounts(tonight),
    db.select({ id: loungeTables.id, name: loungeTables.name }).from(loungeTables).where(and(isNull(loungeTables.deletedAt), eq(loungeTables.active, true))).orderBy(asc(loungeTables.name)),
  ]);
  // Past view reads newest night first.
  const ordered = view === "past" && !night ? [...rows].reverse() : rows;

  return (
    <>
      <PageHeader
        title="Reservations"
        description="Table bookings from the website and from the phone. Confirm them, assign a table, and seat guests when they arrive."
        actions={<NewReservationButton tonight={tonight} />}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Tonight" value={counts.tonight} hint={`${counts.tonightGuests} guest${counts.tonightGuests === 1 ? "" : "s"} expected · ${formatNightDate(tonight)}`} tone="accent" />
        <Stat label="Needs confirming" value={counts.pending} tone={counts.pending > 0 ? "danger" : undefined} hint="Website bookings waiting for a call back" />
        <div className="col-span-2 lg:col-span-1">
          <form className="flex h-full flex-col justify-center gap-2 rounded-xl border border-line bg-surface p-4">
            <label className="text-xs font-medium uppercase tracking-wide text-muted" htmlFor="night">Jump to a night</label>
            <div className="flex gap-2">
              <Input id="night" type="date" name="night" defaultValue={night ?? ""} className="min-w-0 flex-1" />
              <Button variant="secondary">Go</Button>
            </div>
          </form>
        </div>
      </div>

      <nav className="-mx-4 mb-5 flex gap-1 overflow-x-auto border-b border-line px-4" aria-label="Reservation views">
        {(Object.keys(VIEWS) as View[]).map((v) => {
          const active = !night && view === v;
          return (
            <Link
              key={v}
              href={`/reservations?view=${v}`}
              className={cx("shrink-0 border-b-2 px-3 py-3 text-sm font-medium", active ? "border-accent text-white" : "border-transparent text-zinc-500 hover:text-zinc-200")}
            >
              {VIEWS[v].label}
              {v === "pending" && counts.pending > 0 && <span className="ml-1.5 rounded-full bg-accent px-1.5 text-[10px] font-bold text-black">{counts.pending}</span>}
            </Link>
          );
        })}
        {night && <span className="shrink-0 border-b-2 border-accent px-3 py-3 text-sm font-medium text-white">{formatNightDate(night, { weekday: "long", day: "numeric", month: "long" })}</span>}
      </nav>

      <ReservationsBoard rows={ordered.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() }))} tables={tables} tonight={tonight} />
    </>
  );
}
