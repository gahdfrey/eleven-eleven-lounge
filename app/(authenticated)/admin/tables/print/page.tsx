import type { Metadata } from "next";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { loungeTables } from "@/lib/db/schema";
import { getBaseUrl } from "@/lib/url";
import { qrSvg } from "@/lib/qr";
import { PrintButton } from "@/components/admin/PrintButton";

export const metadata: Metadata = { title: "Print QR codes" };

/** Printable table cards: one QR per table, black on white. */
export default async function PrintTablesPage() {
  const [rows, base] = await Promise.all([
    db.select().from(loungeTables).where(and(eq(loungeTables.active, true), isNull(loungeTables.deletedAt))).orderBy(asc(loungeTables.name)),
    getBaseUrl(),
  ]);
  const cards = await Promise.all(rows.map(async (t) => ({ id: t.id, name: t.name, qr: await qrSvg(`${base}/t/${t.qrToken}`) })));
  return (
    <div>
      <div className="no-print mb-6 flex items-center justify-between">
        <p className="text-sm text-muted">{cards.length} active tables. Print, cut, and place one on each table.</p>
        <PrintButton />
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 print:grid-cols-3">
        {cards.map((c) => (
          <div key={c.id} className="break-inside-avoid rounded-xl border border-zinc-300 bg-white p-5 text-center text-black">
            <p className="font-mono text-sm font-semibold">11:11 LOUNGE</p>
            <div className="mx-auto my-3 w-40" dangerouslySetInnerHTML={{ __html: c.qr }} />
            <p className="text-lg font-semibold">{c.name}</p>
            <p className="mt-1 text-xs text-zinc-600">Scan to see the menu and order</p>
          </div>
        ))}
      </div>
    </div>
  );
}
