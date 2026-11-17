import type { Metadata } from "next";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { loungeTables } from "@/lib/db/schema";
import { getActiveStaff, getMenu } from "@/lib/menu";
import { PublicHeader } from "@/components/public/PublicHeader";
import { LiveRefresh } from "@/components/LiveRefresh";
import { changeFingerprint } from "@/lib/live";
import { TableOrder } from "@/components/public/TableOrder";
import { EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Order" };

export default async function TablePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [table] = await db
    .select()
    .from(loungeTables)
    .where(and(eq(loungeTables.qrToken, token), eq(loungeTables.active, true), isNull(loungeTables.deletedAt)))
    .limit(1);

  if (!table) {
    return (
      <>
        <PublicHeader />
        <main className="mx-auto w-full max-w-3xl px-4 py-16">
          <EmptyState title="This QR code isn't active" description="Please ask a member of staff for help, or scan the code on another table." />
        </main>
      </>
    );
  }

  const [menu, staff] = await Promise.all([getMenu(), getActiveStaff()]);
  return (
    <>
      <PublicHeader />
      <LiveRefresh version={await changeFingerprint("public")} endpoint="/api/public/live" intervalMs={4000} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted">You&apos;re at</p>
        <h1 className="mb-6 mt-1 text-3xl font-semibold tracking-tight text-white">{table.name}</h1>
        {menu.length === 0 ? (
          <EmptyState title="The menu isn't ready yet" description="Please ask a member of staff." />
        ) : (
          <TableOrder menu={menu} tableToken={token} staff={staff} />
        )}
      </main>
    </>
  );
}
