import type { Metadata } from "next";
import { getMenu } from "@/lib/menu";
import { PublicHeader } from "@/components/public/PublicHeader";
import { MenuView } from "@/components/public/MenuView";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Menu" };

export default async function MenuPage() {
  const categories = await getMenu();
  return (
    <>
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="text-3xl font-semibold tracking-tight text-white">Menu</h1>
        <p className="mb-8 mt-1 text-sm text-muted">Scan the QR code on your table to order.</p>
        <MenuView categories={categories} />
      </main>
    </>
  );
}
