import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { isManager, requirePageUser } from "@/lib/authz";
import { addDays, lagosDateString, startOfLagosDay } from "@/lib/dates";
import { formatNaira } from "@/lib/money";
import { lowStockProducts, pendingOrderCount, staffAccountability } from "@/lib/reports";
import { Badge, ButtonLink, Card, PageHeader, Stat, Table, Td, Th } from "@/components/ui";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requirePageUser();
  const manager = isManager(user);
  const today = startOfLagosDay(lagosDateString());
  const [rows, pending, lowStock] = await Promise.all([
    staffAccountability(today, addDays(today, 1)),
    pendingOrderCount(manager ? undefined : user.id),
    manager ? lowStockProducts() : Promise.resolve([]),
  ]);

  if (!manager) {
    const me = rows.find((r) => r.id === user.id);
    return (
      <>
        <PageHeader title={`Hi, ${user.firstname}`} description="Your shift at a glance. Every order and payment here is recorded against your name." />
        {pending > 0 && (
          <Link href="/orders" className="mb-6 flex items-center justify-between rounded-xl border border-amber-900 bg-amber-950/40 px-4 py-3 text-sm text-amber-200">
            <span>{pending} customer order{pending === 1 ? "" : "s"} waiting for you</span>
            <ArrowRight size={16} />
          </Link>
        )}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Your sales today" value={formatNaira(me?.sales)} hint={`${me?.billsPaid ?? 0} bills closed`} />
          <Stat label="Open bills" value={me?.openBills ?? 0} hint={formatNaira(me?.openValue)} />
          <Stat label="Cash to remit" value={formatNaira(me?.cashOutstanding)} tone={(me?.cashOutstanding ?? 0) > 0 ? "danger" : undefined} hint="All cash collected, not yet handed over" />
          <Stat label="Transfers + POS today" value={formatNaira((me?.transfer ?? 0) + (me?.pos ?? 0))} />
        </div>
        <div className="mt-6 flex flex-wrap gap-2"><ButtonLink href="/orders/new" size="lg">New order</ButtonLink><ButtonLink href="/orders" size="lg" variant="secondary">Live orders</ButtonLink></div>
      </>
    );
  }

  const sum = (k: "sales" | "cash" | "transfer" | "pos" | "openValue" | "openBills" | "cashOutstanding" | "voidedOrders") => rows.reduce((n, r) => n + r[k], 0);
  const owing = rows.filter((r) => r.cashOutstanding > 0).sort((a, b) => b.cashOutstanding - a.cashOutstanding);

  return (
    <>
      <PageHeader title="Today" description="Sales are counted when a bill is paid. All figures are in Lagos time." actions={<ButtonLink href="/admin/reports" variant="secondary">Full staff report</ButtonLink>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Sales today" value={formatNaira(sum("sales"))} tone="accent" />
        <Stat label="Cash" value={formatNaira(sum("cash"))} hint={`Transfer ${formatNaira(sum("transfer"))} · POS ${formatNaira(sum("pos"))}`} />
        <Stat label="Open bills" value={sum("openBills")} hint={`${formatNaira(sum("openValue"))} not yet paid`} />
        <Stat label="Cash not remitted" value={formatNaira(sum("cashOutstanding"))} tone={sum("cashOutstanding") > 0 ? "danger" : undefined} hint="All staff, all time" />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_300px]">
        <section>
          <h2 className="mb-3 font-semibold text-white">Staff today</h2>
          <Table>
            <thead>
              <tr><Th>Staff</Th><Th className="text-right">Sales</Th><Th className="text-right">Open</Th><Th className="text-right">Voids</Th><Th className="text-right">Cash owed</Th></tr>
            </thead>
            <tbody>
              {rows.filter((r) => r.role !== "admin" || r.sales || r.openBills).map((r) => (
                <tr key={r.id}>
                  <Td><p className="text-white">{r.name}</p><p className="font-mono text-xs text-muted">{r.username}</p></Td>
                  <Td className="text-right tabular-nums">{formatNaira(r.sales)}</Td>
                  <Td className="text-right tabular-nums">{r.openBills ? `${r.openBills} · ${formatNaira(r.openValue)}` : "—"}</Td>
                  <Td className="text-right">{r.voidedOrders ? <Badge tone="warning">{r.voidedOrders}</Badge> : "—"}</Td>
                  <Td className={`text-right tabular-nums ${r.cashOutstanding > 0 ? "text-red-400" : ""}`}>{formatNaira(r.cashOutstanding)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </section>
        <aside className="flex flex-col gap-6">
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-white">Pending orders</h2>
              <Badge tone={pending ? "warning" : "neutral"}>{pending}</Badge>
            </div>
            <Link href="/orders?scope=all" className="text-sm text-accent hover:underline">View all live orders →</Link>
          </Card>
          <Card className="p-4">
            <h2 className="mb-3 font-semibold text-white">Low stock</h2>
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted">Everything is stocked.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {lowStock.map((p) => (
                  <li key={p.id} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-zinc-200">
                      {p.stockQty <= 0 && <AlertTriangle size={13} className="text-red-400" />}
                      {p.name}
                    </span>
                    <span className={p.stockQty <= 0 ? "text-red-400" : "text-amber-400"}>{p.stockQty}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/admin/menu" className="mt-3 block text-sm text-accent hover:underline">Restock →</Link>
          </Card>
          {owing.length > 0 && (
            <Card className="p-4">
              <h2 className="mb-3 font-semibold text-white">Who owes cash</h2>
              <ul className="flex flex-col gap-2 text-sm">
                {owing.slice(0, 6).map((r) => (
                  <li key={r.id} className="flex justify-between"><span className="text-zinc-200">{r.name}</span><span className="tabular-nums text-red-400">{formatNaira(r.cashOutstanding)}</span></li>
                ))}
              </ul>
              <Link href="/admin/reports" className="mt-3 block text-sm text-accent hover:underline">Record remittance →</Link>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}
