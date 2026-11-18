import { sql, type SQL } from "drizzle-orm";
import { db } from "./db";
import { BILL_STATUSES, PAYMENT_METHODS, type BillStatus, type PaymentMethod } from "./db/schema";
import { addDays, lagosDateString, startOfLagosDay } from "./dates";

/**
 * Finance reporting. Every figure is in kobo.
 *
 * A bill's report date is when it was paid (for paid bills) or when it was
 * opened (open and voided bills). A bill's value is the amount paid for paid
 * bills, and the sum of its live items for open bills. For voided bills it is
 * what was on the bill when it was voided: money that was never collected.
 */

export type FinanceFilters = {
  from: string; // YYYY-MM-DD, Lagos
  to: string; // inclusive
  staffId: number | null;
  status: BillStatus | "all";
  method: PaymentMethod | null;
};

export const STATUS_LABELS: Record<FinanceFilters["status"], string> = { all: "All bills", paid: "Paid", open: "Open (unpaid)", void: "Voided" };
export const METHOD_LABELS: Record<PaymentMethod, string> = { cash: "Cash", transfer: "Transfer", pos: "POS" };

const isDay = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

/** Reads filters from URL search params, falling back to "this month, paid bills". */
export function parseFinanceFilters(sp: Record<string, string | string[] | undefined>): FinanceFilters {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : sp[k]) as string | undefined;
  const today = lagosDateString();
  let from = isDay(one("from")) ? one("from")! : `${today.slice(0, 8)}01`;
  let to = isDay(one("to")) ? one("to")! : today;
  if (from > to) [from, to] = [to, from];
  const staffId = Number(one("staff"));
  const status = one("status");
  const method = one("method");
  return {
    from,
    to,
    staffId: Number.isInteger(staffId) && staffId > 0 ? staffId : null,
    status: status === "all" || (BILL_STATUSES as readonly string[]).includes(status ?? "") ? (status as FinanceFilters["status"]) : "paid",
    method: (PAYMENT_METHODS as readonly string[]).includes(method ?? "") ? (method as PaymentMethod) : null,
  };
}

export function filtersToQuery(f: FinanceFilters) {
  const q = new URLSearchParams({ from: f.from, to: f.to, status: f.status });
  if (f.staffId) q.set("staff", String(f.staffId));
  if (f.method) q.set("method", f.method);
  return q.toString();
}

/** Period bounds as SQL timestamptz literals (raw queries can't bind Date objects). */
const range = (f: FinanceFilters) => ({
  start: sql`${startOfLagosDay(f.from).toISOString()}::timestamptz`,
  end: sql`${addDays(startOfLagosDay(f.to), 1).toISOString()}::timestamptz`,
});

/** The report date of a bill (see top of file). */
const BIZ_AT = sql`case when b.status = 'paid' then b.paid_at else b.created_at end`;
/** Items that count toward a bill's value. */
const LINE_COUNTS = sql`(o.status in ('accepted', 'served') or (b.status = 'void' and o.status = 'void'))`;

/** Bills matching the filters. `withStatus: false` ignores the status/method filters (for the overview cards). */
function billWhere(f: FinanceFilters, { withStatus = true } = {}): SQL {
  const { start, end } = range(f);
  const parts: SQL[] = [sql`${BIZ_AT} >= ${start}`, sql`${BIZ_AT} < ${end}`];
  if (f.staffId) parts.push(sql`b.staff_id = ${f.staffId}`);
  if (withStatus) {
    if (f.method) parts.push(sql`b.status = 'paid' and b.payment_method = ${f.method}`);
    else if (f.status !== "all") parts.push(sql`b.status = ${f.status}`);
  }
  return sql.join(parts, sql` and `);
}

/** CTE "fb": filtered bills with their value and report date. */
function filteredBills(f: FinanceFilters, opts?: { withStatus?: boolean }) {
  return sql`fb as (
    select b.*, ${BIZ_AT} as biz_at,
      case when b.status = 'paid' then coalesce(b.paid_amount, 0)
           else coalesce((select sum(oi.qty * oi.unit_price) from orders o join order_items oi on oi.order_id = o.id
                          where o.bill_id = b.id and ${LINE_COUNTS}), 0) end::bigint as value
    from bills b where ${billWhere(f, opts)}
  )`;
}

const num = (v: unknown) => Number(v ?? 0);

async function rows<T>(query: SQL): Promise<T[]> {
  return (await db.execute(query)) as unknown as T[];
}

// ─── Overview ────────────────────────────────────────────────────────────────

export type FinanceSummary = {
  revenue: number;
  paidBills: number;
  avgBill: number;
  openValue: number;
  openBills: number;
  voidValue: number;
  voidBills: number;
  voidedOrders: number;
  voidedOrdersValue: number;
  byMethod: Record<PaymentMethod, number>;
  itemsSold: number;
  cashCollected: number;
  remitted: number;
  /** All time, not just this period: cash staff collected minus cash handed over. */
  cashOutstanding: number;
};

export async function financeSummary(f: FinanceFilters): Promise<FinanceSummary> {
  const { start, end } = range(f);
  const staff = f.staffId ? sql`and staff_id = ${f.staffId}` : sql``;
  const [statusRows, methodRows, items, voids, money] = await Promise.all([
    rows<{ status: BillStatus; n: number; value: number }>(sql`with ${filteredBills(f, { withStatus: false })}
      select status, count(*)::int n, coalesce(sum(value), 0)::bigint value from fb group by status`),
    rows<{ method: PaymentMethod; value: number }>(sql`with ${filteredBills(f, { withStatus: false })}
      select payment_method method, coalesce(sum(value), 0)::bigint value from fb where status = 'paid' group by payment_method`),
    rows<{ qty: number }>(sql`with ${filteredBills(f, { withStatus: false })}
      select coalesce(sum(oi.qty), 0)::int qty from fb b join orders o on o.bill_id = b.id join order_items oi on oi.order_id = o.id
      where b.status = 'paid' and o.status in ('accepted', 'served')`),
    rows<{ n: number; value: number }>(sql`
      select count(distinct o.id)::int n, coalesce(sum(oi.qty * oi.unit_price), 0)::bigint value
      from orders o join bills b on b.id = o.bill_id join order_items oi on oi.order_id = o.id
      where o.status = 'void' and b.status <> 'void' and o.updated_at >= ${start} and o.updated_at < ${end}
      ${f.staffId ? sql`and o.staff_id = ${f.staffId}` : sql``}`),
    rows<{ collected: number; remitted: number; cash_all: number; remitted_all: number }>(sql`select
      (select coalesce(sum(paid_amount), 0) from bills where status = 'paid' and payment_method = 'cash' and paid_at >= ${start} and paid_at < ${end} ${staff})::bigint collected,
      (select coalesce(sum(amount), 0) from remittances where created_at >= ${start} and created_at < ${end} ${staff})::bigint remitted,
      (select coalesce(sum(paid_amount), 0) from bills where status = 'paid' and payment_method = 'cash' ${staff})::bigint cash_all,
      (select coalesce(sum(amount), 0) from remittances where true ${staff})::bigint remitted_all`),
  ]);
  const st = (s: BillStatus) => statusRows.find((r) => r.status === s);
  const paid = st("paid");
  const revenue = num(paid?.value);
  const paidBills = num(paid?.n);
  const m = money[0];
  return {
    revenue,
    paidBills,
    avgBill: paidBills ? Math.round(revenue / paidBills) : 0,
    openValue: num(st("open")?.value),
    openBills: num(st("open")?.n),
    voidValue: num(st("void")?.value),
    voidBills: num(st("void")?.n),
    voidedOrders: num(voids[0]?.n),
    voidedOrdersValue: num(voids[0]?.value),
    byMethod: Object.fromEntries(PAYMENT_METHODS.map((k) => [k, num(methodRows.find((r) => r.method === k)?.value)])) as Record<PaymentMethod, number>,
    itemsSold: num(items[0]?.qty),
    cashCollected: num(m?.collected),
    remitted: num(m?.remitted),
    cashOutstanding: num(m?.cash_all) - num(m?.remitted_all),
  };
}

// ─── Breakdowns (respect every filter) ──────────────────────────────────────

export type TrendBucket = { key: string; label: string; total: number; bills: number; byMethod: Record<PaymentMethod | "none", number> };

/** Value per day (or per month for ranges over ~2 months), split by payment method. */
export async function financeTrend(f: FinanceFilters): Promise<{ unit: "day" | "month"; buckets: TrendBucket[] }> {
  const days = Math.round((startOfLagosDay(f.to).getTime() - startOfLagosDay(f.from).getTime()) / 86400_000) + 1;
  const unit = days > 62 ? "month" : "day";
  const fmt = unit === "day" ? "YYYY-MM-DD" : "YYYY-MM";
  const data = await rows<{ k: string; method: PaymentMethod | null; value: number; n: number }>(sql`with ${filteredBills(f)}
    select to_char(biz_at at time zone 'Africa/Lagos', ${fmt}) k, payment_method method, coalesce(sum(value), 0)::bigint value, count(*)::int n
    from fb group by 1, 2`);

  const keys: string[] = [];
  if (unit === "day") {
    for (let d = startOfLagosDay(f.from); d < addDays(startOfLagosDay(f.to), 1); d = addDays(d, 1)) keys.push(lagosDateString(d));
  } else {
    let [y, mo] = f.from.slice(0, 7).split("-").map(Number);
    const [ey, em] = f.to.slice(0, 7).split("-").map(Number);
    while (y < ey || (y === ey && mo <= em)) {
      keys.push(`${y}-${String(mo).padStart(2, "0")}`);
      if (++mo > 12) [y, mo] = [y + 1, 1];
    }
  }
  const label = (k: string) =>
    unit === "day"
      ? new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${k}T00:00:00Z`))
      : new Intl.DateTimeFormat("en-NG", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${k}-01T00:00:00Z`));
  return {
    unit,
    buckets: keys.map((k) => {
      const mine = data.filter((r) => r.k === k);
      const by = { cash: 0, transfer: 0, pos: 0, none: 0 };
      for (const r of mine) by[r.method ?? "none"] += num(r.value);
      return { key: k, label: label(k), total: mine.reduce((n, r) => n + num(r.value), 0), bills: mine.reduce((n, r) => n + num(r.n), 0), byMethod: by };
    }),
  };
}

/** Value by hour of day (Lagos), to show the busy hours. */
export async function financeByHour(f: FinanceFilters) {
  const data = await rows<{ h: number; value: number; n: number }>(sql`with ${filteredBills(f)}
    select extract(hour from biz_at at time zone 'Africa/Lagos')::int h, coalesce(sum(value), 0)::bigint value, count(*)::int n from fb group by 1`);
  return Array.from({ length: 24 }, (_, h) => {
    const r = data.find((x) => num(x.h) === h);
    return { hour: h, value: num(r?.value), bills: num(r?.n) };
  });
}

export type StaffFinanceRow = {
  id: number;
  name: string;
  username: string;
  role: string;
  bills: number;
  value: number;
  cash: number;
  transfer: number;
  pos: number;
  avgBill: number;
  voidedOrders: number;
  remitted: number;
  cashOutstanding: number;
};

export async function financeByStaff(f: FinanceFilters): Promise<StaffFinanceRow[]> {
  const { start, end } = range(f);
  const data = await rows<Record<string, unknown>>(sql`with ${filteredBills(f)},
    agg as (select staff_id, count(*)::int bills, sum(value)::bigint value,
              sum(case when payment_method = 'cash' then value else 0 end)::bigint cash,
              sum(case when payment_method = 'transfer' then value else 0 end)::bigint transfer,
              sum(case when payment_method = 'pos' then value else 0 end)::bigint pos
            from fb group by staff_id),
    voids as (select staff_id, count(*)::int n from orders where status = 'void' and updated_at >= ${start} and updated_at < ${end} group by staff_id),
    rem as (select staff_id, sum(case when created_at >= ${start} and created_at < ${end} then amount else 0 end)::bigint period, sum(amount)::bigint total from remittances group by staff_id),
    cash as (select staff_id, sum(paid_amount)::bigint total from bills where status = 'paid' and payment_method = 'cash' group by staff_id)
    select u.id, u.firstname || ' ' || u.lastname as name, u.username, u.role,
      coalesce(a.bills, 0) bills, coalesce(a.value, 0) value, coalesce(a.cash, 0) cash, coalesce(a.transfer, 0) transfer, coalesce(a.pos, 0) pos,
      coalesce(v.n, 0) voided, coalesce(r.period, 0) remitted, coalesce(c.total, 0) - coalesce(r.total, 0) outstanding
    from users u
    left join agg a on a.staff_id = u.id
    left join voids v on v.staff_id = u.id
    left join rem r on r.staff_id = u.id
    left join cash c on c.staff_id = u.id
    where (a.staff_id is not null or v.n > 0 or coalesce(c.total, 0) - coalesce(r.total, 0) <> 0)
      ${f.staffId ? sql`and u.id = ${f.staffId}` : sql``}
    order by value desc, name`);
  return data.map((r) => {
    const bills = num(r.bills);
    const value = num(r.value);
    return {
      id: num(r.id),
      name: String(r.name),
      username: String(r.username),
      role: String(r.role),
      bills,
      value,
      cash: num(r.cash),
      transfer: num(r.transfer),
      pos: num(r.pos),
      avgBill: bills ? Math.round(value / bills) : 0,
      voidedOrders: num(r.voided),
      remitted: num(r.remitted),
      cashOutstanding: num(r.outstanding),
    };
  });
}

export type ProductFinanceRow = { productId: number; name: string; category: string; qty: number; value: number; avgPrice: number };

/** Items sold (or on open/void bills, depending on the status filter), best sellers first. */
export async function financeByProduct(f: FinanceFilters): Promise<ProductFinanceRow[]> {
  const data = await rows<Record<string, unknown>>(sql`with ${filteredBills(f)}
    select oi.product_id, coalesce(p.name, max(oi.name)) as name, coalesce(c.name, 'Uncategorised') category,
      sum(oi.qty)::int qty, sum(oi.qty * oi.unit_price)::bigint value
    from fb b join orders o on o.bill_id = b.id join order_items oi on oi.order_id = o.id
    left join products p on p.id = oi.product_id left join categories c on c.id = p.category_id
    where ${LINE_COUNTS}
    group by oi.product_id, p.name, c.name order by value desc, qty desc`);
  return data.map((r) => ({
    productId: num(r.product_id),
    name: String(r.name),
    category: String(r.category),
    qty: num(r.qty),
    value: num(r.value),
    avgPrice: num(r.qty) ? Math.round(num(r.value) / num(r.qty)) : 0,
  }));
}

export function byCategory(products: ProductFinanceRow[]) {
  const map = new Map<string, { category: string; qty: number; value: number }>();
  for (const p of products) {
    const c = map.get(p.category) ?? { category: p.category, qty: 0, value: 0 };
    c.qty += p.qty;
    c.value += p.value;
    map.set(p.category, c);
  }
  return [...map.values()].sort((a, b) => b.value - a.value);
}

export type TransactionRow = {
  id: number;
  date: Date;
  openedAt: Date;
  paidAt: Date | null;
  status: BillStatus;
  method: PaymentMethod | null;
  staff: string;
  staffUsername: string;
  table: string | null;
  customer: string | null;
  orders: number;
  items: number;
  value: number;
  closedBy: string | null;
  voidReason: string | null;
};

/** Bills matching the filters, newest first. */
export async function financeTransactions(f: FinanceFilters, limit = 50_000): Promise<{ rows: TransactionRow[]; total: number }> {
  const [data, count] = await Promise.all([
    rows<Record<string, unknown>>(sql`with ${filteredBills(f)}
      select b.id, b.biz_at, b.created_at, b.paid_at, b.status, b.payment_method, b.value, b.customer_name, b.void_reason,
        u.firstname || ' ' || u.lastname staff, u.username, t.name table_name,
        coalesce(pb.firstname, vb.firstname) closed_by,
        (select count(*) from orders o where o.bill_id = b.id and ${LINE_COUNTS})::int orders,
        (select coalesce(sum(oi.qty), 0) from orders o join order_items oi on oi.order_id = o.id where o.bill_id = b.id and ${LINE_COUNTS})::int items
      from fb b join users u on u.id = b.staff_id
      left join lounge_tables t on t.id = b.table_id
      left join users pb on pb.id = b.paid_by_id
      left join users vb on vb.id = b.voided_by_id
      order by b.biz_at desc, b.id desc limit ${limit}`),
    rows<{ n: number }>(sql`with ${filteredBills(f)} select count(*)::int n from fb`),
  ]);
  return {
    total: num(count[0]?.n),
    rows: data.map((r) => ({
      id: num(r.id),
      date: new Date(r.biz_at as string),
      openedAt: new Date(r.created_at as string),
      paidAt: r.paid_at ? new Date(r.paid_at as string) : null,
      status: r.status as BillStatus,
      method: (r.payment_method as PaymentMethod) ?? null,
      staff: String(r.staff),
      staffUsername: String(r.username),
      table: (r.table_name as string) ?? null,
      customer: (r.customer_name as string) ?? null,
      orders: num(r.orders),
      items: num(r.items),
      value: num(r.value),
      closedBy: (r.closed_by as string) ?? null,
      voidReason: (r.void_reason as string) ?? null,
    })),
  };
}

export type VoidRow = { orderId: number; billId: number; at: Date; staff: string; voidedBy: string | null; reason: string | null; value: number; items: string };

/** Orders a manager voided in the period (each one returned stock and wiped money from a bill). */
export async function financeVoids(f: FinanceFilters): Promise<VoidRow[]> {
  const { start, end } = range(f);
  const data = await rows<Record<string, unknown>>(sql`
    select o.id, o.bill_id, o.updated_at, o.void_reason, u.firstname || ' ' || u.lastname staff, vb.firstname voided_by,
      coalesce(sum(oi.qty * oi.unit_price), 0)::bigint value,
      string_agg(oi.qty || ' × ' || oi.name, ', ' order by oi.id) items
    from orders o join users u on u.id = o.staff_id left join users vb on vb.id = o.voided_by_id
    left join order_items oi on oi.order_id = o.id
    where o.status = 'void' and o.updated_at >= ${start} and o.updated_at < ${end} ${f.staffId ? sql`and o.staff_id = ${f.staffId}` : sql``}
    group by o.id, u.firstname, u.lastname, vb.firstname order by o.updated_at desc limit 5000`);
  return data.map((r) => ({
    orderId: num(r.id),
    billId: num(r.bill_id),
    at: new Date(r.updated_at as string),
    staff: String(r.staff),
    voidedBy: (r.voided_by as string) ?? null,
    reason: (r.void_reason as string) ?? null,
    value: num(r.value),
    items: String(r.items ?? ""),
  }));
}

export type RemittanceRow = { id: number; at: Date; staff: string; receivedBy: string; amount: number; note: string | null };

export async function financeRemittances(f: FinanceFilters): Promise<RemittanceRow[]> {
  const { start, end } = range(f);
  const data = await rows<Record<string, unknown>>(sql`
    select r.id, r.created_at, r.amount, r.note, u.firstname || ' ' || u.lastname staff, rb.firstname || ' ' || rb.lastname received_by
    from remittances r join users u on u.id = r.staff_id join users rb on rb.id = r.received_by_id
    where r.created_at >= ${start} and r.created_at < ${end} ${f.staffId ? sql`and r.staff_id = ${f.staffId}` : sql``}
    order by r.created_at desc limit 5000`);
  return data.map((r) => ({
    id: num(r.id),
    at: new Date(r.created_at as string),
    staff: String(r.staff),
    receivedBy: String(r.received_by),
    amount: num(r.amount),
    note: (r.note as string) ?? null,
  }));
}

/** People who can appear in the staff filter: anyone who has ever owned a bill, plus active staff. */
export async function financeStaffOptions() {
  const data = await rows<{ id: number; name: string; username: string }>(sql`
    select u.id, u.firstname || ' ' || u.lastname as name, u.username from users u
    where u.deleted_at is null and (u.role in ('staff', 'manager', 'admin') or exists (select 1 from bills b where b.staff_id = u.id))
    order by u.firstname, u.lastname`);
  return data.map((r) => ({ id: num(r.id), name: String(r.name), username: String(r.username) }));
}
