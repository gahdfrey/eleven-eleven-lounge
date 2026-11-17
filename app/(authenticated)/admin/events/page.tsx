import type { Metadata } from "next";
import { desc, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { PageHeader } from "@/components/ui";
import { EventsManager } from "@/components/admin/EventsManager";

export const metadata: Metadata = { title: "Events" };

export default async function AdminEventsPage() {
  const rows = await db.select().from(events).where(isNull(events.deletedAt)).orderBy(desc(events.startsAt)).limit(200);
  const now = new Date();
  const withPast = rows.map((e) => ({ ...e, past: (e.endsAt ?? e.startsAt) < now }));
  return (
    <>
      <PageHeader title="Events" description="Published events show on the home page and the public events page." />
      <EventsManager events={withPast} />
    </>
  );
}
