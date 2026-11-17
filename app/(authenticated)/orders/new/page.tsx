import type { Metadata } from "next";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { bills, loungeTables } from "@/lib/db/schema";
import { requirePageUser } from "@/lib/authz";
import { getMenu } from "@/lib/menu";
import { billTotals } from "@/lib/orders";
import { EmptyState, ButtonLink, PageHeader } from "@/components/ui";
import { NewOrderForm } from "@/components/app/NewOrderForm";

export const metadata: Metadata = { title: "New order" };

export default async function NewOrderPage() {
  const user = await requirePageUser();
  const [menu, tables, mine] = await Promise.all([
    getMenu(),
    db
      .select({ id: loungeTables.id, name: loungeTables.name })
      .from(loungeTables)
      .where(and(eq(loungeTables.active, true), isNull(loungeTables.deletedAt)))
      .orderBy(asc(loungeTables.name)),
    db
      .select({ id: bills.id, customerName: bills.customerName, tableName: loungeTables.name })
      .from(bills)
      .leftJoin(loungeTables, eq(loungeTables.id, bills.tableId))
      .where(and(eq(bills.status, "open"), eq(bills.staffId, user.id)))
      .orderBy(desc(bills.createdAt)),
  ]);
  const totals = await billTotals(mine.map((b) => b.id));
  const openBills = mine.map((b) => ({
    id: b.id,
    label: [b.tableName ?? "Walk-in", b.customerName].filter(Boolean).join(" · "),
    total: totals.get(b.id) ?? 0,
  }));

  return (
    <>
      <PageHeader title="New order" description="For customers who order through you instead of the QR code. The order and bill are recorded under your name." />
      {menu.length === 0 ? (
        <EmptyState title="The menu is empty" description="A manager needs to add items under Menu & stock first." action={<ButtonLink href="/orders" variant="secondary">Back</ButtonLink>} />
      ) : (
        <NewOrderForm menu={menu} tables={tables} openBills={openBills} staffName={`${user.firstname} ${user.lastname}`} />
      )}
    </>
  );
}
