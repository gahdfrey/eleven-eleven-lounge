"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { CheckCircle2, Clock, Plus } from "lucide-react";
import type { MenuCategory } from "@/lib/menu";
import { formatNaira } from "@/lib/money";
import { formatTime } from "@/lib/dates";
import { jsonFetcher } from "@/lib/client";
import { PAYMENT_LABELS } from "../StatusBadge";
import { Badge, Button, Card, EmptyState, cx, type Tone } from "../ui";
import { OrderClient } from "./OrderClient";

type PublicBill = {
  code: number;
  status: "open" | "paid" | "void";
  tableName: string | null;
  customerName: string | null;
  staffName: string;
  paymentMethod: string | null;
  paidAt: string | null;
  total: number;
  pendingTotal: number;
  orders: { id: number; status: string; createdAt: string; servedAt: string | null; rejectReason: string | null; total: number; items: { name: string; qty: number; unitPrice: number }[] }[];
};

/** Customer-facing wording for each order status. */
function statusLabel(status: string, staffName: string): [Tone, string] {
  switch (status) {
    case "pending": return ["warning", `Waiting for ${staffName}`];
    case "accepted": return ["info", "Being prepared"];
    case "served": return ["success", "On its way"];
    case "rejected": return ["neutral", "Declined"];
    case "void": return ["danger", "Cancelled"];
    default: return ["neutral", status];
  }
}

export function BillClient({ token, menu }: { token: string; menu: MenuCategory[] }) {
  const { data, error, mutate } = useSWR<{ bill: PublicBill }>(`/api/public/bills/${token}`, jsonFetcher, { refreshInterval: 2500 });
  const [ordering, setOrdering] = useState(false);

  if (error) return <EmptyState title="We couldn't find this bill" description="Please scan the QR code on your table again." />;
  if (!data) return <p className="py-16 text-center text-sm text-muted">Loading your bill…</p>;
  const bill = data.bill;

  if (ordering && bill.status === "open") {
    return (
      <>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Order more</h2>
          <Button variant="ghost" size="sm" onClick={() => setOrdering(false)}>Back to bill</Button>
        </div>
        <OrderClient
          menu={menu}
          mode={{ kind: "add", billToken: token, staffName: bill.staffName }}
          onPlaced={() => {
            setOrdering(false);
            mutate();
            window.scrollTo({ top: 0 });
          }}
        />
      </>
    );
  }

  const waiting = bill.orders.filter((o) => o.status === "pending").length;
  const live = bill.orders.filter((o) => o.status !== "rejected" && o.status !== "void");
  const latest = live[live.length - 1];
  const justServed = bill.status === "open" && latest?.status === "served";

  return (
    <div className="flex flex-col gap-5 pb-10">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Bill #{bill.code}{bill.tableName ? ` · ${bill.tableName}` : ""}</p>
            <p className="mt-2 text-4xl font-semibold tabular-nums text-white">{formatNaira(bill.total)}</p>
            {bill.pendingTotal > 0 && <p className="mt-1 text-sm text-amber-400">+ {formatNaira(bill.pendingTotal)} waiting to be confirmed</p>}
          </div>
          {bill.status === "open" ? (
            <span className="rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">Open</span>
          ) : bill.status === "paid" ? (
            <span className="rounded-full border border-emerald-900 bg-emerald-950/60 px-2.5 py-1 text-xs font-medium text-emerald-300">Paid</span>
          ) : (
            <span className="rounded-full border border-red-900 bg-red-950/50 px-2.5 py-1 text-xs font-medium text-red-300">Cancelled</span>
          )}
        </div>
        <p className="mt-4 border-t border-line pt-4 text-sm text-zinc-300">
          Served by <span className="font-medium text-white">{bill.staffName}</span>
          {bill.status === "open" && <span className="text-muted"> · pay only this person</span>}
        </p>
        {bill.status === "paid" && (
          <p className="mt-1 text-sm text-muted">
            Paid by {PAYMENT_LABELS[bill.paymentMethod ?? ""] ?? bill.paymentMethod} at {bill.paidAt ? formatTime(bill.paidAt) : ""}. Thank you!
          </p>
        )}
      </Card>

      {justServed && (
        <p className="flex items-start gap-2 rounded-lg border border-emerald-900 bg-emerald-950/40 px-3 py-2.5 text-sm text-emerald-200">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          <span>Your order is on its way. Thank you for choosing Eleven Eleven Lounge!</span>
        </p>
      )}

      {waiting > 0 && (
        <p className="flex items-center gap-2 rounded-lg border border-amber-900 bg-amber-950/40 px-3 py-2 text-sm text-amber-200">
          <Clock size={15} /> {bill.staffName} has been notified and will confirm your order shortly.
        </p>
      )}

      {bill.status === "open" && (
        <Button size="lg" onClick={() => setOrdering(true)}>
          <Plus size={18} /> Order more
        </Button>
      )}

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted">Orders</h2>
        <div className="flex flex-col gap-3">
          {bill.orders.map((o) => {
            const [tone, label] = statusLabel(o.status, bill.staffName);
            const served = o.status === "served";
            const gone = o.status === "rejected" || o.status === "void";
            return (
              <Card key={o.id} className={cx("p-4", gone && "opacity-60")}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-muted">{formatTime(o.createdAt)}</span>
                  <Badge tone={tone}>{label}</Badge>
                </div>
                <ul className="text-sm">
                  {o.items.map((i, idx) => (
                    <li key={idx} className="flex justify-between py-0.5">
                      <span className={served || gone ? "text-zinc-500 line-through decoration-zinc-500" : "text-zinc-200"}>{i.qty} × {i.name}</span>
                      <span className={cx("tabular-nums", gone ? "text-zinc-600 line-through" : "text-zinc-400")}>{formatNaira(i.qty * i.unitPrice)}</span>
                    </li>
                  ))}
                </ul>
                {served && <p className="mt-2 text-xs text-emerald-400">On its way to your table{o.servedAt ? ` · ${formatTime(o.servedAt)}` : ""}</p>}
                {gone && <p className="mt-2 text-xs text-zinc-500">{o.status === "void" ? "Removed from your bill" : "Not added to your bill"}{o.rejectReason ? `: ${o.rejectReason}` : ""}</p>}
              </Card>
            );
          })}
        </div>
      </section>

      <p className="text-center text-xs text-zinc-600">
        Keep this page to check your bill. <Link href="/events" className="text-accent hover:underline">See upcoming events</Link>
      </p>
    </div>
  );
}
