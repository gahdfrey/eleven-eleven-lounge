import { formatEventDate, formatTime } from "@/lib/dates";
import type { events } from "@/lib/db/schema";
import { Card, EmptyState } from "../ui";

type Event = typeof events.$inferSelect;

export function EventList({ items }: { items: Event[] }) {
  if (items.length === 0) return <EmptyState title="No upcoming events yet" description="New nights are announced here first." />;
  return (
    <div className="flex flex-col gap-3">
      {items.map((e) => (
        <Card key={e.id} className="flex gap-4 p-4">
          <div className="flex w-16 shrink-0 flex-col items-center justify-center rounded-lg border border-line bg-raised py-2 text-center">
            <span className="text-[11px] uppercase tracking-wide text-muted">{formatEventDate(e.startsAt).split(" ")[0].replace(",", "")}</span>
            <span className="text-xl font-semibold text-white">{new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", day: "numeric" }).format(e.startsAt)}</span>
            <span className="text-[11px] uppercase text-accent">{new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", month: "short" }).format(e.startsAt)}</span>
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-white">{e.title}</h3>
            <p className="mt-0.5 text-sm text-muted">
              {formatTime(e.startsAt)}
              {e.endsAt ? ` – ${formatTime(e.endsAt)}` : ""}
              {e.entry ? ` · ${e.entry}` : ""}
            </p>
            {e.description && <p className="mt-2 whitespace-pre-line text-sm text-zinc-300">{e.description}</p>}
          </div>
        </Card>
      ))}
    </div>
  );
}
