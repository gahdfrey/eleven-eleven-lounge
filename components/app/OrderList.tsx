"use client";

import { useState } from "react";
import { Check, Utensils, X } from "lucide-react";
import { api } from "@/lib/client";
import { formatNaira } from "@/lib/money";
import { formatTime } from "@/lib/dates";
import { OrderStatus } from "../StatusBadge";
import { Button, Card, cx } from "../ui";
import { ReasonDialog } from "./ReasonDialog";

export type OrderView = {
  id: number;
  status: string;
  source: string;
  createdAt: string | Date;
  note: string | null;
  rejectReason: string | null;
  voidReason: string | null;
  items: { id: number; name: string; qty: number; unitPrice: number }[];
};

/**
 * A bill's orders with the actions the viewer may take: accept / decline a
 * waiting order, mark an accepted one served (this takes it out of stock), and
 * — managers only — void.
 */
export function OrderList({ orders, billOpen, canAct, manager, onChanged }: { orders: OrderView[]; billOpen: boolean; canAct: boolean; manager: boolean; onChanged: () => void }) {
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState<null | { kind: "reject" | "void"; orderId: number }>(null);

  async function run(id: number, action: "accept" | "serve") {
    setBusy(id);
    setError("");
    try {
      await api(`/api/orders/${id}/${action}`, { body: {} });
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="rounded-lg border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>}
      {orders.length === 0 && <p className="text-sm text-muted">No items yet.</p>}
      {orders.map((o) => {
        const gone = o.status === "rejected" || o.status === "void";
        return (
          <Card key={o.id} className={cx("p-4", gone && "opacity-60", o.status === "pending" && "border-amber-900/70", o.status === "accepted" && "border-sky-900/70")}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted">
                Order #{o.id} · {formatTime(o.createdAt)} · {o.source === "customer" ? "by customer (QR)" : "entered by staff"}
              </p>
              <OrderStatus status={o.status} />
            </div>
            <ul className="text-sm">
              {o.items.map((i) => (
                <li key={i.id} className="flex justify-between py-0.5">
                  <span className={o.status === "void" ? "text-zinc-500 line-through" : o.status === "served" ? "text-zinc-400" : "text-zinc-200"}>{i.qty} × {i.name}</span>
                  <span className="tabular-nums text-zinc-500">{formatNaira(i.qty * i.unitPrice)}</span>
                </li>
              ))}
            </ul>
            {o.note && <p className="mt-2 rounded-md bg-raised px-3 py-2 text-sm text-zinc-300">“{o.note}”</p>}
            {o.rejectReason && <p className="mt-2 text-xs text-zinc-500">Declined: {o.rejectReason}</p>}
            {o.voidReason && <p className="mt-2 text-xs text-red-400">Voided: {o.voidReason}</p>}
            {billOpen && (canAct || manager) && !gone && (
              <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                {canAct && o.status === "pending" && (
                  <>
                    <Button size="sm" disabled={busy === o.id} onClick={() => run(o.id, "accept")}><Check size={14} /> Accept</Button>
                    <Button size="sm" variant="secondary" disabled={busy === o.id} onClick={() => setDialog({ kind: "reject", orderId: o.id })}><X size={14} /> Decline</Button>
                  </>
                )}
                {canAct && o.status === "accepted" && (
                  <Button size="sm" disabled={busy === o.id} onClick={() => run(o.id, "serve")}><Utensils size={14} /> Mark served</Button>
                )}
                {manager && (o.status === "accepted" || o.status === "served") && (
                  <Button size="sm" variant="danger" disabled={busy === o.id} onClick={() => setDialog({ kind: "void", orderId: o.id })}>Void</Button>
                )}
              </div>
            )}
          </Card>
        );
      })}

      <ReasonDialog
        open={dialog !== null}
        title={dialog?.kind === "reject" ? "Decline order" : "Void order"}
        description={
          dialog?.kind === "reject"
            ? "The customer will see this reason."
            : "Any stock already taken out for these items goes back, and the staff member is notified. This is recorded against your name."
        }
        confirmLabel={dialog?.kind === "reject" ? "Decline" : "Void"}
        onClose={() => setDialog(null)}
        onConfirm={async (reason) => {
          if (!dialog) return;
          await api(`/api/orders/${dialog.orderId}/${dialog.kind}`, { body: { reason } });
          onChanged();
        }}
      />
    </div>
  );
}
