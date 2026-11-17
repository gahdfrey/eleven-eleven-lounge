"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Check, X } from "lucide-react";
import { api, jsonFetcher } from "@/lib/client";
import { formatNaira } from "@/lib/money";
import { timeAgo } from "@/lib/dates";
import { Button, Card, EmptyState } from "../ui";
import { OrderStatus } from "../StatusBadge";
import { ReasonDialog } from "./ReasonDialog";

type Queue = {
  pending: { id: number; billId: number; note: string | null; createdAt: string; customerName: string | null; tableName: string | null; staffName: string; total: number; items: { id: number; name: string; qty: number; unitPrice: number }[] }[];
  openBills: { id: number; customerName: string | null; createdAt: string; tableName: string | null; staffName: string; total: number }[];
  recent: { id: number; billId: number; status: string; source: string; createdAt: string; customerName: string | null; tableName: string | null; staffName: string; summary: string; total: number }[];
};

export function QueueClient({ scopeAll }: { scopeAll: boolean }) {
  const { data, mutate } = useSWR<Queue>(`/api/queue${scopeAll ? "" : "?scope=mine"}`, jsonFetcher, { refreshInterval: 5000 });
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [rejecting, setRejecting] = useState<number | null>(null);

  async function accept(id: number) {
    setBusy(id);
    setError("");
    try {
      await api(`/api/orders/${id}/accept`, { body: {} });
      await mutate();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (!data) return <p className="py-10 text-center text-sm text-muted">Loading…</p>;

  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_360px]">
      <section>
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-white">
          Waiting for confirmation
          {data.pending.length > 0 && <span className="rounded-full bg-accent px-2 text-xs font-bold text-black">{data.pending.length}</span>}
        </h2>
        {error && <p className="mb-3 rounded-lg border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>}
        {data.pending.length === 0 ? (
          <EmptyState title="No new orders" description="Orders customers place from their table QR code appear here. You'll hear a chime." />
        ) : (
          <div className="flex flex-col gap-3">
            {data.pending.map((o) => (
              <Card key={o.id} className="border-amber-900/60 p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{o.tableName ?? "Walk-in"}{o.customerName ? ` · ${o.customerName}` : ""}</p>
                    <p className="text-xs text-muted">{timeAgo(o.createdAt)} · Bill #{o.billId}{scopeAll ? ` · ${o.staffName}` : ""}</p>
                  </div>
                  <p className="text-lg font-semibold tabular-nums text-white">{formatNaira(o.total)}</p>
                </div>
                <ul className="mb-3 text-sm">
                  {o.items.map((i) => (
                    <li key={i.id} className="flex justify-between py-0.5"><span className="text-zinc-200">{i.qty} × {i.name}</span><span className="tabular-nums text-zinc-500">{formatNaira(i.qty * i.unitPrice)}</span></li>
                  ))}
                </ul>
                {o.note && <p className="mb-3 rounded-md bg-raised px-3 py-2 text-sm text-zinc-300">“{o.note}”</p>}
                <div className="flex gap-2">
                  <Button className="flex-1" disabled={busy === o.id} onClick={() => accept(o.id)}><Check size={16} /> Accept</Button>
                  <Button variant="secondary" disabled={busy === o.id} onClick={() => setRejecting(o.id)}><X size={16} /> Decline</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-semibold text-white">{scopeAll ? "All open bills" : "My open bills"}</h2>
        {data.openBills.length === 0 ? (
          <p className="text-sm text-muted">No open bills.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.openBills.map((b) => (
              <li key={b.id}>
                <Link href={`/bills/${b.id}`} className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3 hover:border-zinc-600">
                  <span>
                    <span className="block text-sm text-white">{b.tableName ?? "Walk-in"}{b.customerName ? ` · ${b.customerName}` : ""}</span>
                    <span className="text-xs text-muted">#{b.id} · {timeAgo(b.createdAt)}{scopeAll ? ` · ${b.staffName}` : ""}</span>
                  </span>
                  <span className="tabular-nums text-zinc-200">{formatNaira(b.total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="xl:col-span-2">
        <h2 className="mb-3 font-semibold text-white">Today&apos;s orders</h2>
        {data.recent.length === 0 ? (
          <p className="text-sm text-muted">Accepted, served, declined and voided orders from today appear here.</p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
            {data.recent.map((o) => (
              <li key={o.id}>
                <Link href={`/bills/${o.billId}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 bg-surface px-4 py-3 hover:bg-raised">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-white">{o.summary || "—"}</span>
                    <span className="text-xs text-muted">
                      {o.tableName ?? "Walk-in"}{o.customerName ? ` · ${o.customerName}` : ""} · Bill #{o.billId} · {timeAgo(o.createdAt)}
                      {scopeAll ? ` · ${o.staffName}` : ""} · {o.source === "customer" ? "QR" : "staff"}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <OrderStatus status={o.status} />
                    <span className="w-20 text-right text-sm tabular-nums text-zinc-200">{formatNaira(o.total)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ReasonDialog
        open={rejecting !== null}
        title="Decline order"
        description="The customer will see that the order was declined, with your reason."
        confirmLabel="Decline order"
        onClose={() => setRejecting(null)}
        onConfirm={async (reason) => {
          await api(`/api/orders/${rejecting}/reject`, { body: { reason } });
          await mutate();
        }}
      />
    </div>
  );
}
