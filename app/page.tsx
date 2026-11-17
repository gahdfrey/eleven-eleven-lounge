import Link from "next/link";
import { getUpcomingEvents } from "@/lib/menu";
import { PublicHeader } from "@/components/public/PublicHeader";
import { EventList } from "@/components/public/EventList";
import { ButtonLink } from "@/components/ui";
import { QrCode } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Home() {
  const events = await getUpcomingEvents(3);
  return (
    <>
      <PublicHeader right={<Link href="/login" className="rounded-md px-3 py-1.5 text-zinc-500 hover:text-white">Staff</Link>} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4">
        <section className="border-b border-line py-16 sm:py-24">
          <p className="font-mono text-sm text-accent">11:11</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-6xl">Eleven Eleven Lounge</h1>
          <p className="mt-4 max-w-md text-muted">Drinks, food and good nights. See what&apos;s on, browse the menu, and order straight from your table.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/menu" size="lg">View menu</ButtonLink>
            <ButtonLink href="/events" size="lg" variant="secondary">Upcoming events</ButtonLink>
          </div>
          <p className="mt-8 flex items-center gap-2 text-sm text-zinc-500">
            <QrCode size={16} className="text-accent" /> At the lounge? Scan the QR code on your table to order.
          </p>
        </section>
        <section className="py-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Coming up</h2>
            <Link href="/events" className="text-sm text-accent hover:underline">All events</Link>
          </div>
          <EventList items={events} />
        </section>
      </main>
      <footer className="border-t border-line py-6 text-center text-xs text-zinc-600">© Eleven Eleven Lounge</footer>
    </>
  );
}
