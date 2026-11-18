import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { FINANCE, SERVICE, requirePageUser } from "@/lib/authz";
import { formatDateTime, lagosDateString } from "@/lib/dates";
import { formatNaira } from "@/lib/money";
import {
  METHOD_LABELS,
  STATUS_LABELS,
  byCategory,
  filtersToQuery,
  financeByHour,
  financeByProduct,
  financeByStaff,
  financeRemittances,
  financeStaffOptions,
  financeSummary,
  financeTransactions,
  financeTrend,
  financeVoids,
  parseFinanceFilters,
} from "@/lib/finance";
import type { Dataset } from "@/lib/finance-export";
import { Badge, Card, PageHeader, Stat, Table, Td, Th, buttonClass } from "@/components/ui";
import { FinanceFilters } from "@/components/finance/FinanceFilters";
import { Donut, HBars, Legend, SimpleBars, StackedBars } from "@/components/finance/Charts";
import { METHOD_COLORS, OTHER_COLOR, SERIES } from "@/lib/chart-colors";
import { TransactionsTable } from "@/components/finance/TransactionsTable";
import { RemitButton } from "@/components/admin/RemitButton";

export const metadata: Metadata = { title: "Finance" };

const TABLE_ROWS = 1000;

export default async function FinancePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requirePageUser(FINANCE);
  const f = parseFinanceFilters(await searchParams);
  const q = filtersToQuery(f);
  const today = lagosDateString();

  const [summary, trend, hours, staff, products, tx, voids, remits, staffOptions] = await Promise.all([
    financeSummary(f),
    financeTrend(f),
    financeByHour(f),
    financeByStaff(f),
    financeByProduct(f),
    financeTransactions(f, TABLE_ROWS),
    financeVoids(f),
    financeRemittances(f),
    financeStaffOptions(),
  ]);
  const categories = byCategory(products);
  const valueWord = f.status === "paid" ? "Revenue" : "Value";
  const showUnpaid = f.status !== "paid";
  const csv = (d: Dataset) => `/api/finance/export?format=csv&dataset=${d}&${q}`;
  const filterText = [
    `${f.from === f.to ? f.from : `${f.from} → ${f.to}`}`,
    STATUS_LABELS[f.status],
    f.method && `paid by ${METHOD_LABELS[f.method]}`,
    f.staffId && staffOptions.find((s) => s.id === f.staffId)?.name,
  ].filter(Boolean).join(" · ");

  // Categories: fixed colour per category name order, top 7 + "Other".
  const topCats = categories.slice(0, 7);
  const restCats = categories.slice(7);
  const catSlices = [
    ...topCats.map((c, i) => ({ label: c.category, value: c.value, color: SERIES[i] })),
    ...(restCats.length ? [{ label: "Other", value: restCats.reduce((n, c) => n + c.value, 0), color: OTHER_COLOR }] : []),
  ];
  const methodSlices = (["cash", "transfer", "pos"] as const)
    .map((m) => ({ label: METHOD_LABELS[m], value: summary.byMethod[m], color: METHOD_COLORS[m] }))
    .filter((s) => !f.method || s.label === METHOD_LABELS[f.method]);
  const trendSeries = [
    { key: "cash", label: "Cash", color: METHOD_COLORS.cash },
    { key: "transfer", label: "Transfer", color: METHOD_COLORS.transfer },
    { key: "pos", label: "POS", color: METHOD_COLORS.pos },
    ...(showUnpaid ? [{ key: "none", label: "Unpaid / voided", color: METHOD_COLORS.none }] : []),
  ];
  const busiest = hours.reduce((a, b) => (b.value > a.value ? b : a), hours[0]);
  const hourLabel = (h: number) => `${h % 12 || 12}${h < 12 ? "am" : "pm"}`;

  return (
    <>
      <PageHeader
        title="Finance"
        description="Every naira by day, staff member, payment method and item. Filter, then download exactly what you see."
        actions={
          <div className="flex flex-wrap gap-2">
            <a href={`/api/finance/export?format=xlsx&${q}`} className={buttonClass({})}>
              <FileSpreadsheet size={16} /> Excel
            </a>
            <a href={csv("transactions")} className={buttonClass({ variant: "secondary" })}>
              <Download size={16} /> CSV
            </a>
          </div>
        }
      />

      <FinanceFilters filters={f} today={today} staff={staffOptions} />
      <p className="-mt-3 mb-5 text-xs text-muted">Showing: <span className="text-zinc-300">{filterText}</span></p>

      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Revenue (paid)" value={formatNaira(summary.revenue)} tone="accent" hint={`${summary.paidBills.toLocaleString()} bills · avg ${formatNaira(summary.avgBill)}`} />
        <Stat label="Cash" value={formatNaira(summary.byMethod.cash)} hint={pct(summary.byMethod.cash, summary.revenue)} />
        <Stat label="Transfer" value={formatNaira(summary.byMethod.transfer)} hint={`${pct(summary.byMethod.transfer, summary.revenue)} · check the bank statement`} />
        <Stat label="POS" value={formatNaira(summary.byMethod.pos)} hint={`${pct(summary.byMethod.pos, summary.revenue)} · check the POS settlement`} />
      </div>
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Open, not yet paid" value={formatNaira(summary.openValue)} hint={`${summary.openBills} bill${summary.openBills === 1 ? "" : "s"}`} />
        <Stat
          label="Voided"
          value={formatNaira(summary.voidValue + summary.voidedOrdersValue)}
          tone={summary.voidValue + summary.voidedOrdersValue > 0 ? "danger" : undefined}
          hint={`${summary.voidBills} bills · ${summary.voidedOrders} orders`}
        />
        <Stat label="Cash remitted" value={formatNaira(summary.remitted)} hint={`of ${formatNaira(summary.cashCollected)} cash taken this period`} />
        <Stat label="Cash still with staff" value={formatNaira(summary.cashOutstanding)} tone={summary.cashOutstanding > 0 ? "danger" : undefined} hint="All time, not just this period" />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Section
          className="lg:col-span-2"
          title={`${valueWord} by ${trend.unit}`}
          description={`${summary.itemsSold.toLocaleString()} items sold in this period`}
          dataset="trend"
          csv={csv}
          extra={<Legend items={trendSeries.map((s) => ({ label: s.label, color: s.color }))} />}
        >
          <StackedBars
            series={trendSeries}
            bars={trend.buckets.map((b) => ({ key: b.key, label: b.label, sub: `${b.bills} bill${b.bills === 1 ? "" : "s"}`, values: b.byMethod }))}
          />
        </Section>
        <Section title="Payment methods" description="Paid bills only">
          <Donut slices={methodSlices} centerLabel="Paid" />
        </Section>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Section title={`${valueWord} by staff`} description="Each bill counts for the staff member who owns it" dataset="staff" csv={csv}>
          <HBars rows={staff.filter((s) => s.value > 0).slice(0, 12).map((s) => ({ label: s.name, value: s.value, sub: `${s.bills} bills` }))} />
        </Section>
        <Section title={`${valueWord} by category`} dataset="categories" csv={csv}>
          <Donut slices={catSlices} centerLabel="All items" />
        </Section>
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Section
          title="Busiest hours"
          description={busiest && busiest.value > 0 ? `Peak: ${hourLabel(busiest.hour)}–${hourLabel((busiest.hour + 1) % 24)} (${formatNaira(busiest.value)})` : "When the money comes in"}
          dataset="hours"
          csv={csv}
        >
          <SimpleBars bars={hours.map((h) => ({ key: String(h.hour), label: hourLabel(h.hour), value: h.value, sub: `${h.bills} bills` }))} />
        </Section>
        <Section title="Top items" description="By amount" dataset="products" csv={csv}>
          <HBars rows={products.slice(0, 8).map((p) => ({ label: p.name, value: p.value, sub: `× ${p.qty}` }))} />
        </Section>
      </div>

      <Section title="Staff accountability" description="Money each person handled, and the cash they still have to hand over" dataset="staff" csv={csv} className="mb-8" bare>
        <Table>
          <thead>
            <tr>
              <Th>Staff</Th>
              <Th className="text-right">Bills</Th>
              <Th className="text-right">{valueWord}</Th>
              <Th className="text-right">Cash</Th>
              <Th className="text-right">Transfer</Th>
              <Th className="text-right">POS</Th>
              <Th className="text-right">Avg bill</Th>
              <Th className="text-right">Voids</Th>
              <Th className="text-right">Remitted</Th>
              <Th className="text-right">Cash owed</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id}>
                <Td><p className="text-white">{s.name}</p><p className="font-mono text-xs text-muted">{s.username}</p></Td>
                <Td className="text-right tabular-nums">{s.bills}</Td>
                <Td className="text-right tabular-nums text-white">{formatNaira(s.value)}</Td>
                <Td className="text-right tabular-nums">{formatNaira(s.cash)}</Td>
                <Td className="text-right tabular-nums">{formatNaira(s.transfer)}</Td>
                <Td className="text-right tabular-nums">{formatNaira(s.pos)}</Td>
                <Td className="text-right tabular-nums">{formatNaira(s.avgBill)}</Td>
                <Td className="text-right">{s.voidedOrders ? <Badge tone="warning">{s.voidedOrders}</Badge> : "—"}</Td>
                <Td className="text-right tabular-nums">{formatNaira(s.remitted)}</Td>
                <Td className={`text-right tabular-nums ${s.cashOutstanding > 0 ? "font-semibold text-red-400" : ""}`}>{formatNaira(s.cashOutstanding)}</Td>
                <Td className="text-right"><RemitButton staffId={s.id} staffName={s.name} owed={s.cashOutstanding} /></Td>
              </tr>
            ))}
            {staff.length === 0 && <tr><Td colSpan={11} className="py-10 text-center text-muted">No staff activity for these filters</Td></tr>}
            {staff.length > 1 && (
              <tr className="bg-surface font-medium">
                <Td className="text-white">Total</Td>
                <Td className="text-right tabular-nums">{sum(staff, "bills")}</Td>
                <Td className="text-right tabular-nums text-white">{formatNaira(sum(staff, "value"))}</Td>
                <Td className="text-right tabular-nums">{formatNaira(sum(staff, "cash"))}</Td>
                <Td className="text-right tabular-nums">{formatNaira(sum(staff, "transfer"))}</Td>
                <Td className="text-right tabular-nums">{formatNaira(sum(staff, "pos"))}</Td>
                <Td />
                <Td className="text-right tabular-nums">{sum(staff, "voidedOrders")}</Td>
                <Td className="text-right tabular-nums">{formatNaira(sum(staff, "remitted"))}</Td>
                <Td className="text-right tabular-nums text-red-400">{formatNaira(sum(staff, "cashOutstanding"))}</Td>
                <Td />
              </tr>
            )}
          </tbody>
        </Table>
      </Section>

      <Section title="Items" description="Every item on the matching bills" dataset="products" csv={csv} className="mb-8" bare>
        <Table>
          <thead>
            <tr><Th>Item</Th><Th>Category</Th><Th className="text-right">Qty</Th><Th className="text-right">Avg price</Th><Th className="text-right">{valueWord}</Th><Th className="text-right">Share</Th></tr>
          </thead>
          <tbody>
            {products.slice(0, 50).map((p) => (
              <tr key={p.productId}>
                <Td className="text-white">{p.name}</Td>
                <Td className="text-zinc-400">{p.category}</Td>
                <Td className="text-right tabular-nums">{p.qty.toLocaleString()}</Td>
                <Td className="text-right tabular-nums">{formatNaira(p.avgPrice)}</Td>
                <Td className="text-right tabular-nums text-white">{formatNaira(p.value)}</Td>
                <Td className="text-right tabular-nums text-muted">{pct(p.value, sum(products, "value"))}</Td>
              </tr>
            ))}
            {products.length === 0 && <tr><Td colSpan={6} className="py-10 text-center text-muted">No items for these filters</Td></tr>}
          </tbody>
        </Table>
        {products.length > 50 && <p className="mt-2 text-xs text-muted">Top 50 of {products.length}. The download has every item.</p>}
      </Section>

      <Section title="Bills" description="Every bill matching the filters, newest first" dataset="transactions" csv={csv} className="mb-8" bare>
        <TransactionsTable
          total={tx.total}
          linkBills={SERVICE.includes(user.role)}
          rows={tx.rows.map((r) => ({
            id: r.id,
            date: r.date.toISOString(),
            status: r.status,
            method: r.method,
            staff: r.staff,
            table: r.table,
            customer: r.customer,
            items: r.items,
            value: r.value,
            closedBy: r.closedBy,
            voidReason: r.voidReason,
          }))}
        />
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Voided orders" description="Each one removed money from a bill. Check the reasons." dataset="voids" csv={csv}>
          {voids.length === 0 ? (
            <p className="text-sm text-muted">No orders were voided in this period.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {voids.slice(0, 20).map((v) => (
                <li key={v.orderId} className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-white">{v.staff} <span className="text-muted">· bill #{v.billId} · {formatDateTime(v.at)}</span></p>
                    <p className="truncate text-xs text-zinc-400">{v.items}</p>
                    <p className="text-xs text-amber-300">{v.reason ?? "No reason"}{v.voidedBy && <span className="text-muted"> · by {v.voidedBy}</span>}</p>
                  </div>
                  <span className="shrink-0 tabular-nums text-red-300">{formatNaira(v.value)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="Cash remitted" description="Cash staff handed over in this period" dataset="remittances" csv={csv}>
          {remits.length === 0 ? (
            <p className="text-sm text-muted">No cash was handed over in this period.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {remits.slice(0, 20).map((r) => (
                <li key={r.id} className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-white">{r.staff} <span className="text-muted">→ {r.receivedBy}</span></p>
                    <p className="text-xs text-muted">{formatDateTime(r.at)}{r.note && ` · ${r.note}`}</p>
                  </div>
                  <span className="shrink-0 tabular-nums text-emerald-300">{formatNaira(r.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}

function pct(part: number, whole: number) {
  return whole ? `${Math.round((part / whole) * 100)}%` : "0%";
}

function sum<T, K extends keyof T>(rows: T[], key: K) {
  return rows.reduce((n, r) => n + Number(r[key] ?? 0), 0);
}

function Section({
  title,
  description,
  dataset,
  csv,
  extra,
  className,
  bare,
  children,
}: {
  title: string;
  description?: string;
  dataset?: Dataset;
  csv?: (d: Dataset) => string;
  extra?: ReactNode;
  className?: string;
  /** Render without the card (for full-width tables that bring their own border). */
  bare?: boolean;
  children: ReactNode;
}) {
  const header = (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
      <div>
        <h2 className="font-semibold text-white">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {extra}
        {dataset && csv && (
          <a href={csv(dataset)} className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs text-zinc-400 hover:border-zinc-600 hover:text-white">
            <Download size={12} /> CSV
          </a>
        )}
      </div>
    </div>
  );
  if (bare) return <section className={className}>{header}{children}</section>;
  return <Card className={`p-5 ${className ?? ""}`}>{header}{children}</Card>;
}
