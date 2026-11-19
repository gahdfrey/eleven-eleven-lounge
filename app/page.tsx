import type { Metadata } from "next";
import { getMenu, getUpcomingEvents } from "@/lib/menu";
import { currentNight } from "@/lib/dates";
import { display } from "@/lib/fonts";
import { SITE, upcomingNights } from "@/lib/site";
import { SiteShell } from "@/components/site/SiteShell";
import { Hero } from "@/components/site/Hero";
import { About, Events, Experience, Faq, MenuTeaser, Nights, SiteFooter } from "@/components/site/Sections";
import { Reserve } from "@/components/site/Reserve";
import { Space } from "@/components/site/Space";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: `${SITE.name} ${SITE.city} — ${SITE.tagline}` },
  description: `${SITE.fullName}: four nights a week of music, celestial lighting and table service. Reserve your table online.`,
};

export default async function Home() {
  const [events, menu] = await Promise.all([getUpcomingEvents(4), getMenu()]);
  const nights = upcomingNights(currentNight(), 8);
  const next: Record<number, string> = {};
  for (const n of nights) next[n.night.day] ??= n.date;

  return (
    <div className={`${display.variable} overflow-x-clip bg-black text-white`}>
      <SiteShell home>
        <main>
          <Hero />
          <About />
          <Nights next={next} />
          <Space />
          <Experience />
          <MenuTeaser menu={menu} />
          <Reserve nights={nights.map((n) => ({ date: n.date, title: n.night.title, dayName: n.night.dayName, day: n.night.day }))} />
          <Events events={events.map((e) => ({ id: e.id, title: e.title, description: e.description, startsAt: e.startsAt.toISOString(), entry: e.entry }))} />
          <Faq />
        </main>
        <SiteFooter year={new Date().getFullYear()} />
      </SiteShell>
    </div>
  );
}
