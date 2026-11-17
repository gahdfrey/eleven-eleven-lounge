import type { Metadata } from "next";
import { addDays, formatDateTime, lagosDateString, startOfLagosDay } from "@/lib/dates";
import { formatNaira } from "@/lib/money";
import { recentRemittances, staffAccountability } from "@/lib/reports";
import { Button, Card, Input, PageHeader, Stat, Table, Td, Th, Badge } from "@/components/ui";
import { RemitButton } from "@/components/admin/RemitButton";

export const metadata: Metadata = { title: "Staff & cash" };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const sp = await searchParams;
  const to = sp.to || lagosDateString();
  const from = sp.from || to;
  const [rows, remits] = await Promise.all([
    staffAccountability(startOfLagosDay(from), addDays(startOfLagosDay(to), 1)),
    recentRemittances(15),
  ]);
  const total = (k: "sales" | "cash" | "transfer" | "pos" | "cashOutstanding") => rows.reduce((n, r) => n + r[k], 0);

  return (
    <>
      <PageHeader
        title="Staff & cash"
        description="Who sold what, how they were paid, and how much cash each person still has to hand over."
      />
      <form className="mb-6 flex flex-wrap items-end gap-2">
        <Input type="date" name="from" defaultValue={from} className="w-auto" aria-label="From" />
        <span className="pb-2 text-muted">to</span>
        <Input type="date" name="to" defaultValue={to} className="w-auto" aria-label="To" />
        <Button variant="secondary">Apply</Button>
      </form>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Sales" value={formatNaira(total("sales"))} tone="accent" />
        <Stat label="Cash" value={formatNaira(total("cash"))} />
        <Stat label="Transfer + POS" value={formatNaira(total("transfer") + total("pos"))} hint="Check against the bank statement" />
        <Stat label="Cash still with staff" value={formatNaira(total("cashOutstanding"))} tone={total("cashOutstanding") > 0 ? "danger" : undefined} hint="All time" />
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Staff</Th>
            <Th className="text-right">Bills</Th>
            <Th className="text-right">Sales</Th>
            <Th className="text-right">Cash</Th>
            <Th className="text-right">Transfer</Th>
            <Th className="text-right">POS</Th>
            <Th className="text-right">Voids</Th>
            <Th className="text-right">Open now</Th>
            <Th className="text-right">Cash owed</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <Td><p className="text-white">{r.name}</p><p className="font-mono text-xs text-muted">{r.username}</p></Td>
              <Td className="text-right tabular-nums">{r.billsPaid}</Td>
              <Td className="text-right tabular-nums text-white">{formatNaira(r.sales)}</Td>
              <Td className="text-right tabular-nums">{formatNaira(r.cash)}</Td>
              <Td className="text-right tabular-nums">{formatNaira(r.transfer)}</Td>
              <Td className="text-right tabular-nums">{formatNaira(r.pos)}</Td>
              <Td className="text-right">{r.voidedOrders ? <Badge tone="warning">{r.voidedOrders}</Badge> : "—"}</Td>
              <Td className="text-right tabular-nums">{r.openBills ? `${r.openBills} · ${formatNaira(r.openValue)}` : "—"}</Td>
              <Td className={`text-right tabular-nums ${r.cashOutstanding > 0 ? "font-semibold text-red-400" : ""}`}>
                {formatNaira(r.cashOutstanding)}
                {r.lastRemittanceAt && <p className="text-[11px] font-normal text-zinc-600">last {formatDateTime(r.lastRemittanceAt)}</p>}
              </Td>
              <Td className="text-right"><RemitButton staffId={r.id} staffName={r.name} owed={r.cashOutstanding} /></Td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Card className="mt-8 p-5">
        <h2 className="mb-4 font-semibold text-white">Recent remittances</h2>
        {remits.length === 0 ? (
          <p className="text-sm text-muted">None recorded yet. When a staff member hands over cash, press “Receive cash” on their row.</p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {remits.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span><span className="text-white">{r.staffName}</span> <span className="text-muted">→ {r.receivedBy} · {formatDateTime(r.createdAt)}</span>{r.note && <span className="text-zinc-500"> · {r.note}</span>}</span>
                <span className="tabular-nums text-emerald-300">{formatNaira(r.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
