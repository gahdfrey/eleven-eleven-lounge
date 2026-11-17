import { and, asc, desc, eq, gte, isNull, lt, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "./db";
import { bills, orders, products, remittances, users } from "./db/schema";
import { billTotals } from "./orders";

export type StaffRow = {
  id: number;
  name: string;
  username: string;
  role: string;
  active: boolean;
  /** In the selected period. */
  sales: number;
  billsPaid: number;
  cash: number;
  transfer: number;
  pos: number;
  voidedOrders: number;
  /** Right now. */
  openBills: number;
  openValue: number;
  /** All time: cash collected minus cash handed over. This is what the staff member owes. */
  cashOutstanding: number;
  lastRemittanceAt: Date | null;
};

/**
 * Per-staff accountability. Sales are attributed to the staff member who
 * owns each bill; cash outstanding is everything they collected in cash
 * that hasn't been recorded as remitted.
 */
export async function staffAccountability(from: Date, to: Date): Promise<StaffRow[]> {
  const [staff, paid, cashAll, remitted, voided, open] = await Promise.all([
    db
      .select({ id: users.id, firstname: users.firstname, lastname: users.lastname, username: users.username, role: users.role, active: users.active, staffNo: users.staffNo })
      .from(users)
      .where(isNull(users.deletedAt))
      .orderBy(asc(users.staffNo)),
    db
      .select({
        staffId: bills.staffId,
        method: bills.paymentMethod,
        amount: sql<number>`coalesce(sum(${bills.paidAmount}), 0)::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(bills)
      .where(and(eq(bills.status, "paid"), gte(bills.paidAt, from), lt(bills.paidAt, to)))
      .groupBy(bills.staffId, bills.paymentMethod),
    db
      .select({ staffId: bills.staffId, amount: sql<number>`coalesce(sum(${bills.paidAmount}), 0)::int` })
      .from(bills)
      .where(and(eq(bills.status, "paid"), eq(bills.paymentMethod, "cash")))
      .groupBy(bills.staffId),
    db
      .select({ staffId: remittances.staffId, amount: sql<number>`coalesce(sum(${remittances.amount}), 0)::int`, last: sql<Date | null>`max(${remittances.createdAt})` })
      .from(remittances)
      .groupBy(remittances.staffId),
    db
      .select({ staffId: orders.staffId, count: sql<number>`count(*)::int` })
      .from(orders)
      .where(and(eq(orders.status, "void"), gte(orders.updatedAt, from), lt(orders.updatedAt, to)))
      .groupBy(orders.staffId),
    db.select({ id: bills.id, staffId: bills.staffId }).from(bills).where(eq(bills.status, "open")),
  ]);
  const openTotals = await billTotals(open.map((b) => b.id));

  return staff
    .map((s) => {
      const mine = paid.filter((p) => p.staffId === s.id);
      const by = (m: string) => mine.find((p) => p.method === m)?.amount ?? 0;
      const myOpen = open.filter((b) => b.staffId === s.id);
      const rem = remitted.find((r) => r.staffId === s.id);
      return {
        id: s.id,
        name: `${s.firstname} ${s.lastname}`,
        username: s.username,
        role: s.role,
        active: s.active,
        sales: mine.reduce((n, p) => n + p.amount, 0),
        billsPaid: mine.reduce((n, p) => n + p.count, 0),
        cash: by("cash"),
        transfer: by("transfer"),
        pos: by("pos"),
        voidedOrders: voided.find((v) => v.staffId === s.id)?.count ?? 0,
        openBills: myOpen.length,
        openValue: myOpen.reduce((n, b) => n + (openTotals.get(b.id) ?? 0), 0),
        cashOutstanding: (cashAll.find((c) => c.staffId === s.id)?.amount ?? 0) - (rem?.amount ?? 0),
        lastRemittanceAt: rem?.last ? new Date(rem.last) : null,
      };
    })
    .filter((r) => r.active || r.sales || r.openBills || r.cashOutstanding);
}

export async function lowStockProducts() {
  return db
    .select({ id: products.id, name: products.name, stockQty: products.stockQty, lowStockAt: products.lowStockAt })
    .from(products)
    .where(and(isNull(products.deletedAt), eq(products.trackStock, true), lte(products.stockQty, products.lowStockAt)))
    .orderBy(asc(products.stockQty))
    .limit(20);
}

export async function pendingOrderCount(staffId?: number) {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(orders)
    .where(and(eq(orders.status, "pending"), staffId ? eq(orders.staffId, staffId) : undefined));
  return row?.n ?? 0;
}

export async function recentRemittances(limit = 20) {
  const receiver = alias(users, "receiver");
  return db
    .select({
      id: remittances.id,
      amount: remittances.amount,
      note: remittances.note,
      createdAt: remittances.createdAt,
      staffName: sql<string>`${users.firstname} || ' ' || ${users.lastname}`,
      receivedBy: receiver.firstname,
    })
    .from(remittances)
    .innerJoin(users, eq(users.id, remittances.staffId))
    .innerJoin(receiver, eq(receiver.id, remittances.receivedById))
    .orderBy(desc(remittances.createdAt))
    .limit(limit);
}
