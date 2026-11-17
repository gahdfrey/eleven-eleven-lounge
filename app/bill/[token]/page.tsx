import type { Metadata } from "next";
import { getMenu } from "@/lib/menu";
import { PublicHeader } from "@/components/public/PublicHeader";
import { BillClient } from "@/components/public/BillClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your bill" };

export default async function BillPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const menu = await getMenu();
  return (
    <>
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6">
        <BillClient token={token} menu={menu} />
      </main>
    </>
  );
}
