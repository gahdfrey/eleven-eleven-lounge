import { display } from "@/lib/fonts";
import { SiteShell } from "./SiteShell";
import { SiteFooter } from "./Sections";
import { FadeUp, RevealText } from "./motion";

/** Layout for the website's inner pages (/menu, /events): same nav, scroll, cursor and footer as home. */
export function SitePage({ kicker, title, intro, children }: { kicker: string; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <div className={`${display.variable} overflow-x-clip bg-black text-white`}>
      <SiteShell>
        <main className="min-h-screen">
          <header className="mx-auto max-w-7xl px-5 pb-12 pt-32 sm:px-8 sm:pt-40">
            <p className="mb-5 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.45em] text-accent"><span className="h-px w-8 bg-accent" />{kicker}</p>
            <RevealText as="h1" text={title} className="font-display text-[2.4rem] font-bold uppercase leading-none text-white min-[400px]:text-6xl sm:text-8xl" />
            {intro && <FadeUp delay={0.3} className="mt-6 max-w-xl text-lg text-zinc-400">{intro}</FadeUp>}
          </header>
          {children}
        </main>
        <SiteFooter year={new Date().getFullYear()} />
      </SiteShell>
    </div>
  );
}
