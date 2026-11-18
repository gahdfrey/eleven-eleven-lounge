import { and, asc, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { db } from "./db";
import {
  BILLABLE_ORDER_STATUSES,
  bills,
  loungeTables,
  orderItems,
  orders,
  products,
  stockMovements,
  users,
  type PaymentMethod,
} from "./db/schema";
import { AppError } from "./api";
import { pgError } from "./db/errors";
import { randomToken } from "./tokens";
import { isManager, type CurrentUser } from "./authz";
import { notify } from "./notifications";
import { formatNaira } from "./money";

/**
 * Accountability rules enforced here (the whole point of the app):
 * - Every bill and order belongs to exactly one staff member.
 * - Accepting an order (or staff entering one) puts it on the bill and
 *   *reserves* its stock: menus and new orders only see what isn't reserved.
 * - Stock physically leaves inventory when the order is marked **served**
 *   (or, at the latest, when the bill is paid — paying serves anything left),
 *   atomically, never below zero, with a ledger row. `orders.stockDeductedAt`
 *   records that it happened, so it can never happen twice.
 * - Staff cannot delete or void anything once accepted; only a manager can,
 *   with a reason, and any deducted stock goes back with a ledger entry.
 * - A paid bill is frozen: its amount and payment method are recorded against the staff member.
 */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type OrderLineInput = { productId: number; qty: number };

/** A customer can have at most this many orders waiting for their server at once. */
export const MAX_WAITING_ORDERS_PER_BILL = 5;

/**
 * Runs a transaction, retrying a few times if Postgres aborts it because of a
 * deadlock or serialization clash with another busy-night transaction.
 * Business errors (AppError) are never retried.
 */
export async function inTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await db.transaction(fn);
    } catch (err) {
      const code = pgError(err)?.code;
      if (attempt < 5 && (code === "40P01" || code === "40001" || code === "55P03")) {
        await new Promise((r) => setTimeout(r, 15 * attempt + Math.random() * 40));
        continue;
      }
      throw err;
    }
  }
}

function canActOnStaffRecord(user: CurrentUser, staffId: number) {
  return user.id === staffId || isManager(user);
}

function mergeLines(lines: OrderLineInput[]) {
  const map = new Map<number, number>();
  for (const l of lines) map.set(l.productId, (map.get(l.productId) ?? 0) + l.qty);
  // Always sorted by product id so concurrent transactions lock rows in the same order (no deadlocks).
  return [...map].map(([productId, qty]) => ({ productId, qty })).sort((a, b) => a.productId - b.productId);
}

/**
 * Takes an order's items out of stock (once). Throws, rolling back the
 * transaction, if anything is short.
 */
async function deductStock(tx: Tx, orderId: number, actorId: number | null) {
  const [o] = await tx.select({ deducted: orders.stockDeductedAt }).from(orders).where(eq(orders.id, orderId));
  if (o?.deducted) return;
  const items = await tx
    .select({ productId: orderItems.productId, qty: orderItems.qty, name: orderItems.name })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  for (const item of mergeLines(items)) {
    const name = items.find((i) => i.productId === item.productId)!.name;
    const [updated] = await tx
      .update(products)
      .set({ stockQty: sql`${products.stockQty} - ${item.qty}` })
      .where(
        and(
          eq(products.id, item.productId),
          eq(products.trackStock, true),
          gte(products.stockQty, item.qty),
        ),
      )
      .returning({ stockQty: products.stockQty });

    if (updated) {
      await tx.insert(stockMovements).values({
        productId: item.productId,
        change: -item.qty,
        balanceAfter: updated.stockQty,
        reason: "sale",
        orderId,
        userId: actorId,
      });
      continue;
    }

    const [p] = await tx
      .select({ trackStock: products.trackStock, stockQty: products.stockQty })
      .from(products)
      .where(eq(products.id, item.productId));
    if (p?.trackStock) {
      throw new AppError(
        p.stockQty > 0
          ? `Only ${p.stockQty} × ${name} left in stock.`
          : `${name} is out of stock. Restock it or remove it from the order.`,
        409,
      );
    }
  }
  await tx.update(orders).set({ stockDeductedAt: new Date() }).where(eq(orders.id, orderId));
}

/** Puts back stock deducted for an order (used when a manager voids it). No-op if it was never deducted. */
async function restoreStock(tx: Tx, orderId: number, actorId: number, note: string) {
  const [o] = await tx.select({ deducted: orders.stockDeductedAt }).from(orders).where(eq(orders.id, orderId));
  if (!o?.deducted) return;
  const items = await tx
    .select({ productId: orderItems.productId, qty: orderItems.qty })
    .from(orderItems)
    .innerJoin(products, eq(products.id, orderItems.productId))
    .where(and(eq(orderItems.orderId, orderId), eq(products.trackStock, true)));

  for (const item of mergeLines(items)) {
    const [updated] = await tx
      .update(products)
      .set({ stockQty: sql`${products.stockQty} + ${item.qty}` })
      .where(eq(products.id, item.productId))
      .returning({ stockQty: products.stockQty });
    await tx.insert(stockMovements).values({
      productId: item.productId,
      change: item.qty,
      balanceAfter: updated.stockQty,
      reason: "void",
      orderId,
      userId: actorId,
      note,
    });
  }
  await tx.update(orders).set({ stockDeductedAt: null }).where(eq(orders.id, orderId));
}

/**
 * Quantity per product that is promised to accepted orders but not yet served
 * (so still physically in stock, but not available to anyone else).
 */
export async function reservedQty(executor: Pick<typeof db, "select"> = db, productIds?: number[]) {
  const rows = await executor
    .select({ productId: orderItems.productId, qty: sql<number>`coalesce(sum(${orderItems.qty}), 0)::int` })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(
      and(
        eq(orders.status, "accepted"),
        isNull(orders.stockDeductedAt),
        productIds ? inArray(orderItems.productId, productIds) : undefined,
      ),
    )
    .groupBy(orderItems.productId);
  return new Map(rows.map((r) => [r.productId, r.qty]));
}

/** Throws if any line needs more than is in stock and not already reserved. Locks the product rows. */
async function assertAvailable(tx: Tx, lines: { productId: number; qty: number }[]) {
  const merged = mergeLines(lines);
  if (merged.length === 0) return;
  const ids = merged.map((l) => l.productId);
  const rows = await tx.select().from(products).where(inArray(products.id, ids)).orderBy(asc(products.id)).for("update");
  const reserved = await reservedQty(tx, ids);
  for (const line of merged) {
    const p = rows.find((r) => r.id === line.productId);
    if (!p || !p.trackStock) continue;
    const free = p.stockQty - (reserved.get(p.id) ?? 0);
    if (free < line.qty) {
      throw new AppError(free > 0 ? `Only ${free} × ${p.name} left.` : `${p.name} is sold out.`, 409);
    }
  }
}

async function lockOpenBill(tx: Tx, billId: number) {
  const [bill] = await tx.select().from(bills).where(eq(bills.id, billId)).for("update");
  if (!bill) throw new AppError("Bill not found", 404);
  if (bill.status !== "open") throw new AppError(`This bill is already ${bill.status}.`, 409);
  return bill;
}

/** Validates lines against the live menu and returns price/name snapshots. */
async function priceLines(tx: Tx, lines: OrderLineInput[]) {
  const merged = mergeLines(lines);
  if (merged.length === 0) throw new AppError("Add at least one item.");
  const rows = await tx
    .select()
    .from(products)
    .where(and(inArray(products.id, merged.map((l) => l.productId)), isNull(products.deletedAt)));
  return merged.map((line) => {
    const p = rows.find((r) => r.id === line.productId);
    if (!p || !p.available) throw new AppError("One of the items is no longer on the menu. Please refresh.", 409);
    return { productId: p.id, name: p.name, unitPrice: p.price, qty: line.qty };
  });
}

export type NewBill = {
  staffId: number;
  tableId?: number | null;
  customerName?: string | null;
  customerPhone?: string | null;
};

/**
 * Creates an order — on an existing open bill, or on a brand-new bill created
 * in the same transaction (so a failed first order never leaves an empty bill).
 * Staff orders are accepted immediately (stock reserved); customer orders wait
 * as "pending" until the staff accepts them. Stock is deducted when served.
 *
 * `clientRef` makes customer submissions idempotent: resending the same order
 * (e.g. after a Wi-Fi blip) returns the original instead of a duplicate.
 */
export async function createOrder(input: {
  bill: { id: number } | { create: NewBill };
  source: "customer" | "staff";
  lines: OrderLineInput[];
  note?: string | null;
  actor?: CurrentUser;
  clientRef?: string | null;
}): Promise<{ orderId: number; billId: number; accessToken: string; duplicate: boolean }> {
  const run = () =>
    inTransaction(async (tx) => {
      if (input.clientRef) {
        const [existing] = await tx
          .select({ orderId: orders.id, billId: bills.id, accessToken: bills.accessToken })
          .from(orders)
          .innerJoin(bills, eq(bills.id, orders.billId))
          .where(eq(orders.clientRef, input.clientRef))
          .limit(1);
        if (existing) return { ...existing, duplicate: true };
      }

      let bill;
      if ("create" in input.bill) {
        [bill] = await tx
          .insert(bills)
          .values({
            staffId: input.bill.create.staffId,
            tableId: input.bill.create.tableId ?? null,
            customerName: input.bill.create.customerName || null,
            customerPhone: input.bill.create.customerPhone || null,
            accessToken: randomToken(16),
          })
          .returning();
      } else {
        bill = await lockOpenBill(tx, input.bill.id);
      }

      if (input.source === "staff") {
        if (!input.actor || !canActOnStaffRecord(input.actor, bill.staffId)) {
          throw new AppError("Only the staff member who owns this bill (or a manager) can add to it.", 403);
        }
      } else {
        const [{ waiting }] = await tx
          .select({ waiting: sql<number>`count(*)::int` })
          .from(orders)
          .where(and(eq(orders.billId, bill.id), eq(orders.status, "pending")));
        if (waiting >= MAX_WAITING_ORDERS_PER_BILL) {
          throw new AppError("You have several orders waiting. Please wait for your server to confirm them first.", 429);
        }
      }

      const priced = await priceLines(tx, input.lines);
      await assertAvailable(tx, priced);
      const now = new Date();
      const [order] = await tx
        .insert(orders)
        .values({
          billId: bill.id,
          staffId: bill.staffId,
          source: input.source,
          status: input.source === "staff" ? "accepted" : "pending",
          acceptedAt: input.source === "staff" ? now : null,
          note: input.note || null,
          clientRef: input.clientRef || null,
        })
        .returning({ id: orders.id });
      await tx.insert(orderItems).values(priced.map((p) => ({ ...p, orderId: order.id })));

      if (input.source === "customer") {
        const count = priced.reduce((n, p) => n + p.qty, 0);
        const total = priced.reduce((n, p) => n + p.qty * p.unitPrice, 0);
        const [table] = bill.tableId
          ? await tx.select({ name: loungeTables.name }).from(loungeTables).where(eq(loungeTables.id, bill.tableId))
          : [];
        await notify(
          bill.staffId,
          {
            title: `New order${table ? ` · ${table.name}` : ""}`,
            body: `${bill.customerName || "A customer"} ordered ${count} item${count === 1 ? "" : "s"} (${formatNaira(total)}). Tap to accept.`,
            link: `/bills/${bill.id}`,
          },
          tx,
        );
      }
      return { orderId: order.id, billId: bill.id, accessToken: bill.accessToken, duplicate: false };
    });

  try {
    return await run();
  } catch (err) {
    // Two copies of the same submission raced; the other one won — return it.
    if (input.clientRef && pgError(err)?.constraint === "orders_client_ref_unique") return run();
    throw err;
  }
}

async function lockOrder(tx: Tx, orderId: number) {
  const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
  if (!order) throw new AppError("Order not found", 404);
  return order;
}

export async function acceptOrder(orderId: number, actor: CurrentUser) {
  return inTransaction(async (tx) => {
    const order = await lockOrder(tx, orderId);
    if (!canActOnStaffRecord(actor, order.staffId)) throw new AppError("This order belongs to another staff member.", 403);
    if (order.status !== "pending") throw new AppError(`This order is already ${order.status}.`, 409);
    await lockOpenBill(tx, order.billId);
    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    await assertAvailable(tx, items);
    await tx.update(orders).set({ status: "accepted", acceptedAt: new Date() }).where(eq(orders.id, order.id));
  });
}

export async function rejectOrder(orderId: number, actor: CurrentUser, reason: string) {
  return inTransaction(async (tx) => {
    const order = await lockOrder(tx, orderId);
    if (!canActOnStaffRecord(actor, order.staffId)) throw new AppError("This order belongs to another staff member.", 403);
    if (order.status !== "pending") throw new AppError(`This order is already ${order.status}.`, 409);
    await tx.update(orders).set({ status: "rejected", rejectReason: reason }).where(eq(orders.id, order.id));
  });
}

export async function markServed(orderId: number, actor: CurrentUser) {
  return inTransaction(async (tx) => {
    const order = await lockOrder(tx, orderId);
    if (!canActOnStaffRecord(actor, order.staffId)) throw new AppError("This order belongs to another staff member.", 403);
    if (order.status !== "accepted") throw new AppError("Only accepted orders can be marked served.", 409);
    await lockOpenBill(tx, order.billId);
    await deductStock(tx, order.id, actor.id);
    await tx.update(orders).set({ status: "served", servedAt: new Date() }).where(eq(orders.id, order.id));
  });
}

/** Manager-only: cancels an accepted/served order, returns any deducted stock, and tells the staff member. */
export async function voidOrder(orderId: number, manager: CurrentUser, reason: string) {
  if (!isManager(manager)) throw new AppError("Only a manager can void an order.", 403);
  return inTransaction(async (tx) => {
    const order = await lockOrder(tx, orderId);
    if (!BILLABLE_ORDER_STATUSES.includes(order.status)) throw new AppError(`This order is ${order.status} and can't be voided.`, 409);
    await lockOpenBill(tx, order.billId);
    await restoreStock(tx, order.id, manager.id, `Order #${order.id} voided: ${reason}`);
    await tx
      .update(orders)
      .set({ status: "void", voidReason: reason, voidedById: manager.id })
      .where(eq(orders.id, order.id));
    if (order.staffId !== manager.id) {
      await notify(
        order.staffId,
        { title: `Order #${order.id} voided`, body: `${manager.firstname} voided it: ${reason}`, link: `/bills/${order.billId}` },
        tx,
      );
    }
  });
}

/** Sum of accepted + served items per bill, in kobo. */
export async function billTotals(billIds: number[], executor: Pick<typeof db, "select"> = db) {
  if (billIds.length === 0) return new Map<number, number>();
  const rows = await executor
    .select({
      billId: orders.billId,
      total: sql<number>`coalesce(sum(${orderItems.qty} * ${orderItems.unitPrice}), 0)::int`,
    })
    .from(orders)
    .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(and(inArray(orders.billId, billIds), inArray(orders.status, BILLABLE_ORDER_STATUSES)))
    .groupBy(orders.billId);
  return new Map(rows.map((r) => [r.billId, r.total]));
}

export async function payBill(billId: number, actor: CurrentUser, method: PaymentMethod) {
  return inTransaction(async (tx) => {
    const bill = await lockOpenBill(tx, billId);
    if (!canActOnStaffRecord(actor, bill.staffId)) throw new AppError("Only the staff member who owns this bill (or a manager) can close it.", 403);
    const [pending] = await tx
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.billId, bill.id), eq(orders.status, "pending")))
      .limit(1);
    if (pending) throw new AppError("Accept or decline the waiting order before recording payment.", 409);
    const total = (await billTotals([bill.id], tx)).get(bill.id) ?? 0;
    if (total <= 0) throw new AppError("This bill has nothing on it. Ask a manager to void it instead.", 409);
    // Anything paid for has been handed over: serve what's left so its stock is deducted.
    const unserved = await tx
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.billId, bill.id), eq(orders.status, "accepted")))
      .for("update");
    for (const o of unserved) {
      await deductStock(tx, o.id, actor.id);
      await tx.update(orders).set({ status: "served", servedAt: new Date() }).where(eq(orders.id, o.id));
    }
    await tx
      .update(bills)
      .set({ status: "paid", paymentMethod: method, paidAmount: total, paidAt: new Date(), paidById: actor.id })
      .where(eq(bills.id, bill.id));
    return total;
  });
}

/** Manager-only: voids a whole open bill, returning any stock that was deducted. */
export async function voidBill(billId: number, manager: CurrentUser, reason: string) {
  if (!isManager(manager)) throw new AppError("Only a manager can void a bill.", 403);
  return inTransaction(async (tx) => {
    const bill = await lockOpenBill(tx, billId);
    const billOrders = await tx.select().from(orders).where(eq(orders.billId, bill.id)).for("update");
    for (const o of billOrders) {
      if (BILLABLE_ORDER_STATUSES.includes(o.status)) {
        await restoreStock(tx, o.id, manager.id, `Bill #${bill.id} voided: ${reason}`);
        await tx.update(orders).set({ status: "void", voidReason: reason, voidedById: manager.id }).where(eq(orders.id, o.id));
      } else if (o.status === "pending") {
        await tx.update(orders).set({ status: "rejected", rejectReason: `Bill voided: ${reason}` }).where(eq(orders.id, o.id));
      }
    }
    await tx.update(bills).set({ status: "void", voidReason: reason, voidedById: manager.id }).where(eq(bills.id, bill.id));
    if (bill.staffId !== manager.id) {
      await notify(bill.staffId, { title: `Bill #${bill.id} voided`, body: `${manager.firstname}: ${reason}`, link: `/bills/${bill.id}` }, tx);
    }
  });
}

/** Full bill with its staff, table, orders and items — used by staff and customer views. */
export async function getBillDetail(where: { id: number } | { accessToken: string }) {
  const [bill] = await db
    .select({
      bill: bills,
      staffFirstname: users.firstname,
      staffLastname: users.lastname,
      staffUsername: users.username,
      tableName: loungeTables.name,
    })
    .from(bills)
    .innerJoin(users, eq(users.id, bills.staffId))
    .leftJoin(loungeTables, eq(loungeTables.id, bills.tableId))
    .where("id" in where ? eq(bills.id, where.id) : eq(bills.accessToken, where.accessToken))
    .limit(1);
  if (!bill) return null;

  const billOrders = await db.select().from(orders).where(eq(orders.billId, bill.bill.id)).orderBy(desc(orders.createdAt));
  const items = billOrders.length
    ? await db.select().from(orderItems).where(inArray(orderItems.orderId, billOrders.map((o) => o.id))).orderBy(asc(orderItems.id))
    : [];

  const ordersWithItems = billOrders.map((o) => {
    const lines = items.filter((i) => i.orderId === o.id);
    return { ...o, items: lines, total: lines.reduce((n, i) => n + i.qty * i.unitPrice, 0) };
  });
  const total = ordersWithItems.filter((o) => BILLABLE_ORDER_STATUSES.includes(o.status)).reduce((n, o) => n + o.total, 0);
  const pendingTotal = ordersWithItems.filter((o) => o.status === "pending").reduce((n, o) => n + o.total, 0);

  return {
    ...bill.bill,
    staff: { id: bill.bill.staffId, name: `${bill.staffFirstname} ${bill.staffLastname}`, username: bill.staffUsername },
    tableName: bill.tableName,
    orders: ordersWithItems,
    total,
    pendingTotal,
  };
}

export type BillDetail = NonNullable<Awaited<ReturnType<typeof getBillDetail>>>;
