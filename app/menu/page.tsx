import type { Metadata } from "next";
import { getMenu } from "@/lib/menu";
import { LiveRefresh } from "@/components/LiveRefresh";
import { changeFingerprint } from "@/lib/live";
import { MenuView } from "@/components/public/MenuView";
import { SitePage } from "@/components/site/SitePage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Menu" };

export default async function MenuPage() {
  const categories = await getMenu();
  return (
    <SitePage kicker="From the bar" title="The menu" intro="At the lounge? Scan the QR code on your table to order straight from your phone.">
      <LiveRefresh version={await changeFingerprint("public")} endpoint="/api/public/live" intervalMs={10000} />
      <div className="mx-auto max-w-3xl px-5 pb-28 sm:px-8">
        <MenuView categories={categories} stickyTop="top-16" />
      </div>
    </SitePage>
  );
}
