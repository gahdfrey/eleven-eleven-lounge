import { NextResponse } from "next/server";
import { and, desc, eq, gte, inArray, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { bills, loungeTables, orderItems, orders, users } from "@/lib/db/schema";
import { handle } from "@/lib/api";
import { isManager, requireUser } from "@/lib/authz";
import { billTotals } from "@/lib/orders";
import { lagosDateString, startOfLagosDay } from "@/lib/dates";

/**
 * Live work queue: customer orders waiting for confirmation, open bills, and
 * today's recent orders. Staff see only their own. Managers and admins see
 * everyone's by default (?scope=mine narrows it to their own).
 */
export const GET = handle(async (request: Request) => {
  const user = await requireUser();
  const all = isManager(user) && new URL(request.url).searchParams.get("scope") !== "mine";

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

  const recentRows = await db
    .select({
      id: orders.id,
      billId: orders.billId,
      status: orders.status,
      source: orders.source,
      createdAt: orders.createdAt,
      customerName: bills.customerName,
      tableName: loungeTables.name,
      staffName: users.firstname,
    })
    .from(orders)
    .innerJoin(bills, eq(bills.id, orders.billId))
    .innerJoin(users, eq(users.id, orders.staffId))
    .leftJoin(loungeTables, eq(loungeTables.id, bills.tableId))
    .where(
      and(
        ne(orders.status, "pending"),
        gte(orders.createdAt, startOfLagosDay(lagosDateString())),
        all ? undefined : eq(orders.staffId, user.id),
      ),
    )
    .orderBy(desc(orders.createdAt))
    .limit(30);
  const recentItems = recentRows.length
    ? await db.select().from(orderItems).where(inArray(orderItems.orderId, recentRows.map((o) => o.id)))
    : [];

  return NextResponse.json({
    scope: all ? "all" : "mine",
    recent: recentRows.map((o) => {
      const lines = recentItems.filter((i) => i.orderId === o.id);
      return {
        ...o,
        summary: lines.map((i) => `${i.qty} × ${i.name}`).join(", "),
        total: lines.reduce((n, i) => n + i.qty * i.unitPrice, 0),
      };
    }),
    pending: pendingRows.map((o) => {
      const lines = items.filter((i) => i.orderId === o.id);
      return { ...o, items: lines, total: lines.reduce((n, i) => n + i.qty * i.unitPrice, 0) };
    }),
    openBills: openBills.map((b) => ({ ...b, total: totals.get(b.id) ?? 0 })),
  });
});
