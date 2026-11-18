import { NextResponse } from "next/server";
import { and, desc, eq, gte, inArray, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { bills, loungeTables, orderItems, orders, users } from "@/lib/db/schema";
import { handle } from "@/lib/api";
import { isManager, requireUser } from "@/lib/authz";
import { billTotals } from "@/lib/orders";
import { lagosDateString, startOfLagosDay } from "@/lib/dates";

/**
 * Live work queue: customer orders waiting for confirmation, accepted orders
 * waiting to be served (serving takes them out of stock), open bills, and
 * today's recent orders. Staff see only their own. Managers and admins see
 * everyone's by default (?scope=mine narrows it to their own).
 */
export const GET = handle(async (request: Request) => {
  const user = await requireUser();
  const all = isManager(user) && new URL(request.url).searchParams.get("scope") !== "mine";

  const queueRows = await db
    .select({
      id: orders.id,
      billId: orders.billId,
      status: orders.status,
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
    .where(and(inArray(orders.status, ["pending", "accepted"]), all ? undefined : eq(orders.staffId, user.id)))
    .orderBy(desc(orders.createdAt));

  const items = queueRows.length
    ? await db.select().from(orderItems).where(inArray(orderItems.orderId, queueRows.map((o) => o.id)))
    : [];
  const withItems = (o: (typeof queueRows)[number]) => {
    const lines = items.filter((i) => i.orderId === o.id);
    return { ...o, items: lines, total: lines.reduce((n, i) => n + i.qty * i.unitPrice, 0) };
  };

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
      billStatus: bills.status,
      paymentMethod: bills.paymentMethod,
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
    pending: queueRows.filter((o) => o.status === "pending").map(withItems),
    toServe: queueRows.filter((o) => o.status === "accepted").map(withItems),
    openBills: openBills.map((b) => ({ ...b, total: totals.get(b.id) ?? 0 })),
  });
});
