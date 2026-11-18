"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { formatDateTime } from "@/lib/dates";
import { formatNaira } from "@/lib/money";
import { BillStatus, PAYMENT_LABELS } from "../StatusBadge";
import { Button, Input, Table, Td, Th } from "../ui";

export type TxRow = {
  id: number;
  date: string;
  status: string;
  method: string | null;
  staff: string;
  table: string | null;
  customer: string | null;
  items: number;
  value: number;
  closedBy: string | null;
  voidReason: string | null;
};

const PAGE = 25;

/** Bills for the current filters: search across bill #, staff, table and customer, 25 per page. */
export function TransactionsTable({ rows, total, linkBills }: { rows: TxRow[]; total: number; linkBills: boolean }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase().replace(/^#/, "");
    if (!s) return rows;
    return rows.filter((r) => [String(r.id), r.staff, r.table, r.customer, r.closedBy, r.voidReason].some((v) => v?.toLowerCase().includes(s)));
  }, [rows, q]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const current = Math.min(page, pages - 1);
  const shown = filtered.slice(current * PAGE, current * PAGE + PAGE);
  const sum = filtered.reduce((n, r) => n + r.value, 0);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="relative w-full sm:w-72">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search bill #, staff, table, customer" className="pl-9" />
        </div>
        <p className="text-xs text-muted">
          {filtered.length.toLocaleString()} bill{filtered.length === 1 ? "" : "s"} · <span className="text-white">{formatNaira(sum)}</span>
          {total > rows.length && <> · showing the newest {rows.length.toLocaleString()} of {total.toLocaleString()}; the download has all of them</>}
        </p>
      </div>
      <Table>
        <thead>
          <tr>
            <Th>Bill</Th>
            <Th>Date</Th>
            <Th>Staff</Th>
            <Th>Table / customer</Th>
            <Th>Status</Th>
            <Th>Payment</Th>
            <Th className="text-right">Items</Th>
            <Th className="text-right">Amount</Th>
          </tr>
        </thead>
        <tbody>
          {shown.map((r) => (
            <tr key={r.id} className="hover:bg-raised/40">
              <Td className="font-mono text-xs">
                {linkBills ? <Link href={`/bills/${r.id}`} className="text-accent hover:underline">#{r.id}</Link> : <span className="text-zinc-300">#{r.id}</span>}
              </Td>
              <Td className="whitespace-nowrap text-zinc-300">{formatDateTime(r.date)}</Td>
              <Td className="text-white">{r.staff}</Td>
              <Td className="text-zinc-300">{r.table ?? "Walk-in"}{r.customer && <span className="text-muted"> · {r.customer}</span>}</Td>
              <Td>
                <BillStatus status={r.status} />
                {r.voidReason && <p className="mt-1 max-w-[180px] truncate text-xs text-muted" title={r.voidReason}>{r.voidReason}</p>}
              </Td>
              <Td className="text-zinc-300">{r.method ? PAYMENT_LABELS[r.method] ?? r.method : "—"}{r.closedBy && <p className="text-xs text-muted">by {r.closedBy}</p>}</Td>
              <Td className="text-right tabular-nums">{r.items}</Td>
              <Td className="text-right tabular-nums text-white">{formatNaira(r.value)}</Td>
            </tr>
          ))}
          {shown.length === 0 && (
            <tr><Td colSpan={8} className="py-10 text-center text-muted">No bills match these filters</Td></tr>
          )}
        </tbody>
      </Table>
      {pages > 1 && (
        <div className="mt-3 flex items-center justify-end gap-2 text-xs text-muted">
          <span>Page {current + 1} of {pages}</span>
          <Button variant="secondary" size="sm" disabled={current === 0} onClick={() => setPage(current - 1)} aria-label="Previous page"><ChevronLeft size={14} /></Button>
          <Button variant="secondary" size="sm" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} aria-label="Next page"><ChevronRight size={14} /></Button>
        </div>
      )}
    </div>
  );
}
