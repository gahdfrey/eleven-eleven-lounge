import { NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { bills, loungeTables, orderItems, orders, users } from "@/lib/db/schema";
import { handle } from "@/lib/api";
import { isManager, requireUser } from "@/lib/authz";
import { billTotals } from "@/lib/orders";

/**
 * Live work queue for the logged-in staff member: customer orders waiting for
 * them, and their open bills. Managers can pass ?scope=all to see everyone's.
 */
export const GET = handle(async (request: Request) => {
  const user = await requireUser();
  const all = isManager(user) && new URL(request.url).searchParams.get("scope") === "all";

  const pendingRows = await db
    .select({
      id: orders.id,
      billId: orders.billId,
      note: orders.note,
      createdAt: orders.createdAt,
      customerName: bills.customerName,
      tableName: loungeTables.name,
      staffName: users.firstname,
    })
    .from(orders)
    .innerJoin(bills, eq(bills.id, orders.billId))
    .innerJoin(users, eq(users.id, orders.staffId))
    .leftJoin(loungeTables, eq(loungeTables.id, bills.tableId))
    .where(and(eq(orders.status, "pending"), all ? undefined : eq(orders.staffId, user.id)))
    .orderBy(orders.createdAt);

  const items = pendingRows.length
    ? await db.select().from(orderItems).where(inArray(orderItems.orderId, pendingRows.map((o) => o.id)))
    : [];

  const openBills = await db
    .select({
      id: bills.id,
      customerName: bills.customerName,
      createdAt: bills.createdAt,
      tableName: loungeTables.name,
      staffName: users.firstname,
    })
    .from(bills)
    .innerJoin(users, eq(users.id, bills.staffId))
    .leftJoin(loungeTables, eq(loungeTables.id, bills.tableId))
    .where(and(eq(bills.status, "open"), all ? undefined : eq(bills.staffId, user.id)))
    .orderBy(desc(bills.createdAt));
  const totals = await billTotals(openBills.map((b) => b.id));

  return NextResponse.json({
    pending: pendingRows.map((o) => {
      const lines = items.filter((i) => i.orderId === o.id);
      return { ...o, items: lines, total: lines.reduce((n, i) => n + i.qty * i.unitPrice, 0) };
    }),
    openBills: openBills.map((b) => ({ ...b, total: totals.get(b.id) ?? 0 })),
  });
});
