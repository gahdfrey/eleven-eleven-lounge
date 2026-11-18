import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, gte, lt, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { bills, loungeTables, users, type BillStatus as BillStatusT } from "@/lib/db/schema";
import { isManager, requirePageUser, SERVICE } from "@/lib/authz";
import { addDays, formatDateTime, lagosDateString, startOfLagosDay } from "@/lib/dates";
import { formatNaira } from "@/lib/money";
import { billTotals } from "@/lib/orders";
import { BillStatus, PAYMENT_LABELS } from "@/components/StatusBadge";
import { PayBillButton } from "@/components/app/PayBillButton";
import { EmptyState, Input, PageHeader, Select, Table, Td, Th, Button } from "@/components/ui";

export const metadata: Metadata = { title: "Bills" };

export default async function BillsPage({ searchParams }: { searchParams: Promise<{ status?: string; date?: string; staff?: string }> }) {
  const user = await requirePageUser(SERVICE);
  const manager = isManager(user);
  const sp = await searchParams;
  const date = sp.date || lagosDateString();
  const status = (["open", "paid", "void"] as const).includes(sp.status as BillStatusT) ? (sp.status as BillStatusT) : undefined;
  const from = startOfLagosDay(date);

  const conds: SQL[] = [];
  // Open bills show regardless of date; closed ones by the day they were opened.
  if (status !== "open") conds.push(gte(bills.createdAt, from), lt(bills.createdAt, addDays(from, 1)));
  if (status) conds.push(eq(bills.status, status));
  if (!manager) conds.push(eq(bills.staffId, user.id));
  else if (sp.staff) conds.push(eq(bills.staffId, Number(sp.staff)));

  const [rows, staff] = await Promise.all([
    db
      .select({ bill: bills, tableName: loungeTables.name, staffName: users.firstname })
      .from(bills)
      .innerJoin(users, eq(users.id, bills.staffId))
      .leftJoin(loungeTables, eq(loungeTables.id, bills.tableId))
      .where(and(...conds))
      .orderBy(desc(bills.createdAt))
      .limit(300),
    manager ? db.select({ id: users.id, firstname: users.firstname, lastname: users.lastname }).from(users).orderBy(users.firstname) : Promise.resolve([]),
  ]);
  const totals = await billTotals(rows.filter((r) => r.bill.status === "open").map((r) => r.bill.id));
  const sum = rows.filter((r) => r.bill.status === "paid").reduce((n, r) => n + (r.bill.paidAmount ?? 0), 0);

  return (
    <>
      <PageHeader title={manager ? "Bills" : "My bills"} description={`${rows.length} bill${rows.length === 1 ? "" : "s"} · ${formatNaira(sum)} paid`} />
      <form className="mb-4 flex flex-wrap items-end gap-2">
        <Input type="date" name="date" defaultValue={date} className="w-auto" />
        <Select name="status" defaultValue={status ?? ""} className="w-auto">
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="paid">Paid</option>
          <option value="void">Voided</option>
        </Select>
        {manager && (
          <Select name="staff" defaultValue={sp.staff ?? ""} className="w-auto">
            <option value="">All staff</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.firstname} {s.lastname}</option>)}
          </Select>
        )}
        <Button variant="secondary">Filter</Button>
      </form>
      {rows.length === 0 ? (
        <EmptyState title="No bills" description="Try a different date or filter." />
      ) : (
        <Table>
          <thead>
            <tr><Th>Bill</Th><Th>Table / customer</Th>{manager && <Th>Staff</Th>}<Th>Status</Th><Th className="text-right">Amount</Th><Th /></tr>
          </thead>
          <tbody>
            {rows.map(({ bill, tableName, staffName }) => (
              <tr key={bill.id} className="hover:bg-surface">
                <Td><Link href={`/bills/${bill.id}`} className="font-medium text-white hover:text-accent">#{bill.id}</Link><p className="text-xs text-muted">{formatDateTime(bill.createdAt)}</p></Td>
                <Td>{tableName ?? "Walk-in"}{bill.customerName ? <span className="text-muted"> · {bill.customerName}</span> : null}</Td>
                {manager && <Td>{staffName}</Td>}
                <Td><BillStatus status={bill.status} />{bill.paymentMethod && <span className="ml-2 text-xs text-muted">{PAYMENT_LABELS[bill.paymentMethod]}</span>}</Td>
                <Td className="text-right tabular-nums">{formatNaira(bill.status === "paid" ? bill.paidAmount : totals.get(bill.id) ?? 0)}</Td>
                <Td className="text-right">
                  {bill.status === "open" && (bill.staffId === user.id || manager) && <PayBillButton billId={bill.id} total={totals.get(bill.id) ?? 0} />}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
