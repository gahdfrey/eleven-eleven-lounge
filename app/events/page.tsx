import type { Metadata } from "next";
import { getUpcomingEvents } from "@/lib/menu";
import { SitePage } from "@/components/site/SitePage";
import { Events } from "@/components/site/Sections";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Events" };

export default async function EventsPage() {
  const events = await getUpcomingEvents();
  return (
    <SitePage kicker="Coming up" title="Events" intro="Special nights, guest DJs and one-offs, on top of the four weekly residencies.">
      <Events bare events={events.map((e) => ({ id: e.id, title: e.title, description: e.description, startsAt: e.startsAt.toISOString(), entry: e.entry }))} />
    </SitePage>
  );
}
