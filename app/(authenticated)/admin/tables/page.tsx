import type { Metadata } from "next";
import { asc, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { loungeTables } from "@/lib/db/schema";
import { getBaseUrl } from "@/lib/url";
import { qrSvg } from "@/lib/qr";
import { ButtonLink, PageHeader } from "@/components/ui";
import { TablesManager } from "@/components/admin/TablesManager";
import { Printer } from "lucide-react";

export const metadata: Metadata = { title: "Tables & QR codes" };

export default async function TablesPage() {
  const [rows, base] = await Promise.all([
    db.select().from(loungeTables).where(isNull(loungeTables.deletedAt)).orderBy(asc(loungeTables.name)),
    getBaseUrl(),
  ]);
  const tables = await Promise.all(
    rows.map(async (t) => ({ id: t.id, name: t.name, active: t.active, url: `${base}/t/${t.qrToken}`, qr: await qrSvg(`${base}/t/${t.qrToken}`) })),
  );
  return (
    <>
      <PageHeader
        title="Tables & QR codes"
        description="Each table gets its own QR code. Customers scan it to see the menu and order to a staff member of their choice."
        actions={tables.length > 0 && <ButtonLink href="/admin/tables/print" variant="secondary" target="_blank"><Printer size={16} /> Print all</ButtonLink>}
      />
      <TablesManager tables={tables} />
    </>
  );
}
