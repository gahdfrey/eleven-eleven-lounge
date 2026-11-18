"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { RotateCcw } from "lucide-react";
import type { FinanceFilters as Filters } from "@/lib/finance";
import { Input, Select, cx } from "../ui";

type Preset = { key: string; label: string; range: (today: string) => [string, string] };

const shift = (day: string, days: number) => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const monthStart = (day: string) => `${day.slice(0, 8)}01`;

const PRESETS: Preset[] = [
  { key: "today", label: "Today", range: (t) => [t, t] },
  { key: "yesterday", label: "Yesterday", range: (t) => [shift(t, -1), shift(t, -1)] },
  { key: "7d", label: "Last 7 days", range: (t) => [shift(t, -6), t] },
  { key: "30d", label: "Last 30 days", range: (t) => [shift(t, -29), t] },
  { key: "month", label: "This month", range: (t) => [monthStart(t), t] },
  { key: "lastmonth", label: "Last month", range: (t) => { const end = shift(monthStart(t), -1); return [monthStart(end), end]; } },
  { key: "year", label: "This year", range: (t) => [`${t.slice(0, 4)}-01-01`, t] },
];

/** One row of filters above the charts. Every change updates the URL, so a filtered view can be bookmarked or shared. */
export function FinanceFilters({ filters, today, staff }: { filters: Filters; today: string; staff: { id: number; name: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const preset = PRESETS.find((p) => { const [a, b] = p.range(today); return a === filters.from && b === filters.to; })?.key ?? "custom";

  function go(next: Partial<Filters>) {
    const f = { ...filters, ...next };
    const q = new URLSearchParams({ from: f.from, to: f.to, status: f.method ? "paid" : f.status });
    if (f.staffId) q.set("staff", String(f.staffId));
    if (f.method) q.set("method", f.method);
    start(() => router.push(`/finance?${q}`, { scroll: false }));
  }

  return (
    <div className={cx("mb-6 rounded-xl border border-line bg-surface p-3 transition-opacity", pending && "opacity-60")}>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <label className="col-span-2 md:col-span-1">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted">Period</span>
          <Select
            value={preset}
            onChange={(e) => {
              const p = PRESETS.find((x) => x.key === e.target.value);
              if (p) { const [from, to] = p.range(today); go({ from, to }); }
            }}
          >
            {PRESETS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            <option value="custom" disabled>Custom range</option>
          </Select>
        </label>
        <label>
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted">From</span>
          <Input type="date" value={filters.from} max={today} onChange={(e) => e.target.value && go({ from: e.target.value })} />
        </label>
        <label>
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted">To</span>
          <Input type="date" value={filters.to} max={today} onChange={(e) => e.target.value && go({ to: e.target.value })} />
        </label>
        <label>
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted">Staff</span>
          <Select value={filters.staffId ?? ""} onChange={(e) => go({ staffId: e.target.value ? Number(e.target.value) : null })}>
            <option value="">Everyone</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </label>
        <label>
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted">Bill status</span>
          <Select value={filters.status} onChange={(e) => go({ status: e.target.value as Filters["status"], method: e.target.value === "paid" ? filters.method : null })}>
            <option value="paid">Paid</option>
            <option value="open">Open (unpaid)</option>
            <option value="void">Voided</option>
            <option value="all">All bills</option>
          </Select>
        </label>
        <label>
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted">Payment</span>
          <Select value={filters.method ?? ""} onChange={(e) => go({ method: (e.target.value || null) as Filters["method"] })}>
            <option value="">All methods</option>
            <option value="cash">Cash</option>
            <option value="transfer">Transfer</option>
            <option value="pos">POS</option>
          </Select>
        </label>
      </div>
      {(filters.staffId || filters.method || filters.status !== "paid" || preset !== "month") && (
        <button type="button" onClick={() => router.push("/finance", { scroll: false })} className="mt-2 inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white">
          <RotateCcw size={12} /> Reset filters
        </button>
      )}
    </div>
  );
}
