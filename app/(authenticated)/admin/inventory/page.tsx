import type { Metadata } from "next";
import { and, asc, desc, eq, gte, lt, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { products, stockMovements, users, STOCK_REASONS, type StockReason } from "@/lib/db/schema";
import { addDays, formatDateTime, lagosDateString, startOfLagosDay } from "@/lib/dates";
import { Badge, Button, EmptyState, Input, PageHeader, Select, Table, Td, Th, type Tone } from "@/components/ui";

export const metadata: Metadata = { title: "Stock ledger" };

const reasonTone: Record<StockReason, Tone> = { restock: "success", sale: "info", void: "warning", adjustment: "neutral", waste: "danger" };

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ product?: string; reason?: string; from?: string; to?: string }> }) {
  const sp = await searchParams;
  const to = sp.to || lagosDateString();
  const from = sp.from || lagosDateString(addDays(new Date(), -6));
  const conds: SQL[] = [gte(stockMovements.createdAt, startOfLagosDay(from)), lt(stockMovements.createdAt, addDays(startOfLagosDay(to), 1))];
  if (sp.product) conds.push(eq(stockMovements.productId, Number(sp.product)));
  if (STOCK_REASONS.includes(sp.reason as StockReason)) conds.push(eq(stockMovements.reason, sp.reason as StockReason));

  const [rows, allProducts] = await Promise.all([
    db
      .select({ m: stockMovements, product: products.name, user: users.firstname })
      .from(stockMovements)
      .innerJoin(products, eq(products.id, stockMovements.productId))
      .leftJoin(users, eq(users.id, stockMovements.userId))
      .where(and(...conds))
      .orderBy(desc(stockMovements.createdAt))
      .limit(500),
    db.select({ id: products.id, name: products.name }).from(products).orderBy(asc(products.name)),
  ]);

  return (
    <>
      <PageHeader title="Stock ledger" description="Every bottle in and out, who did it, and why. Sales are recorded against the staff member who accepted the order." />
      <form className="mb-4 flex flex-wrap gap-2">
        <Input type="date" name="from" defaultValue={from} className="w-auto" />
        <Input type="date" name="to" defaultValue={to} className="w-auto" />
        <Select name="product" defaultValue={sp.product ?? ""} className="w-auto">
          <option value="">All items</option>
          {allProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        <Select name="reason" defaultValue={sp.reason ?? ""} className="w-auto">
          <option value="">All movements</option>
          {STOCK_REASONS.map((r) => <option key={r} value={r} className="capitalize">{r}</option>)}
        </Select>
        <Button variant="secondary">Filter</Button>
      </form>
      {rows.length === 0 ? (
        <EmptyState title="No stock movements" description="Nothing in this period." />
      ) : (
        <Table>
          <thead><tr><Th>When</Th><Th>Item</Th><Th>Type</Th><Th className="text-right">Change</Th><Th className="text-right">Balance</Th><Th>By</Th><Th>Details</Th></tr></thead>
          <tbody>
            {rows.map(({ m, product, user }) => (
              <tr key={m.id}>
                <Td className="whitespace-nowrap text-muted">{formatDateTime(m.createdAt)}</Td>
                <Td className="text-white">{product}</Td>
                <Td><Badge tone={reasonTone[m.reason]} className="capitalize">{m.reason}</Badge></Td>
                <Td className={`text-right tabular-nums ${m.change < 0 ? "text-red-300" : "text-emerald-300"}`}>{m.change > 0 ? "+" : ""}{m.change}</Td>
                <Td className="text-right tabular-nums">{m.balanceAfter}</Td>
                <Td>{user ?? "—"}</Td>
                <Td className="text-muted">
                  {m.orderId ? `Order #${m.orderId} ` : ""}{m.note}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
