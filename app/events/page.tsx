import type { Metadata } from "next";
import { getUpcomingEvents } from "@/lib/menu";
import { PublicHeader } from "@/components/public/PublicHeader";
import { EventList } from "@/components/public/EventList";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Events" };

export default async function EventsPage() {
  const events = await getUpcomingEvents();
  return (
    <>
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="mb-8 text-3xl font-semibold tracking-tight text-white">Upcoming events</h1>
        <EventList items={events} />
      </main>
    </>
  );
}
