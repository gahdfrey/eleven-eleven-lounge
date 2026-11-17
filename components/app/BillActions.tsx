"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, Check, CreditCard, Landmark, Plus, QrCode, Utensils, X } from "lucide-react";
import type { BillDetail } from "@/lib/orders";
import type { MenuCategory } from "@/lib/menu";
import { api } from "@/lib/client";
import { formatNaira } from "@/lib/money";
import { formatTime } from "@/lib/dates";
import { OrderStatus } from "../StatusBadge";
import { Modal } from "../Modal";
import { Button, Card, cx } from "../ui";
import { ItemPicker } from "./ItemPicker";
import { ReasonDialog } from "./ReasonDialog";

type Props = {
  bill: Pick<BillDetail, "id" | "status" | "total" | "pendingTotal" | "orders">;
  menu: MenuCategory[];
  canAct: boolean;
  manager: boolean;
  customerQr: string;
  customerUrl: string;
  openPicker: boolean;
};

const METHODS = [
  { value: "cash", label: "Cash", icon: Banknote, hint: "You must remit this cash." },
  { value: "transfer", label: "Transfer", icon: Landmark, hint: "Confirm it has landed in the lounge account." },
  { value: "pos", label: "POS / card", icon: CreditCard, hint: "Use the lounge POS terminal." },
] as const;

export function BillActions({ bill, menu, canAct, manager, customerQr, customerUrl, openPicker }: Props) {
  const router = useRouter();
  const [picker, setPicker] = useState(openPicker && bill.status === "open" && canAct);
  const [paying, setPaying] = useState(false);
  const [method, setMethod] = useState<string | null>(null);
  const [share, setShare] = useState(false);
  const [dialog, setDialog] = useState<null | { kind: "reject" | "void"; orderId: number } | { kind: "voidBill" }>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isOpen = bill.status === "open";
  const pending = bill.orders.filter((o) => o.status === "pending").length;

  useEffect(() => {
    // Drop ?add=1 so a refresh doesn't reopen the picker.
    if (openPicker) router.replace(`/bills/${bill.id}`, { scroll: false });
  }, [openPicker, bill.id, router]);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {isOpen && canAct && (
        <div className="mb-6 flex flex-wrap gap-2">
          <Button onClick={() => setPicker(true)}><Plus size={16} /> Add items</Button>
          <Button variant="secondary" onClick={() => setPaying(true)} disabled={bill.total <= 0 || pending > 0}>
            <Check size={16} /> Close bill · {formatNaira(bill.total)}
          </Button>
          <Button variant="ghost" onClick={() => setShare(true)}><QrCode size={16} /> Customer view</Button>
          {manager && <Button variant="danger" onClick={() => setDialog({ kind: "voidBill" })}>Void bill</Button>}
        </div>
      )}
      {pending > 0 && isOpen && <p className="mb-4 text-sm text-amber-300">Accept or decline the waiting order{pending > 1 ? "s" : ""} before closing this bill.</p>}
      {error && <p className="mb-4 rounded-lg border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>}

      <div className="flex flex-col gap-3">
        {bill.orders.length === 0 && <p className="text-sm text-muted">No items yet.</p>}
        {bill.orders.map((o) => (
          <Card key={o.id} className={cx("p-4", (o.status === "rejected" || o.status === "void") && "opacity-60", o.status === "pending" && "border-amber-900/60")}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted">
                Order #{o.id} · {formatTime(o.createdAt)} · {o.source === "customer" ? "by customer (QR)" : "entered by staff"}
              </p>
              <OrderStatus status={o.status} />
            </div>
            <ul className="text-sm">
              {o.items.map((i) => (
                <li key={i.id} className="flex justify-between py-0.5">
                  <span className={o.status === "void" ? "text-zinc-500 line-through" : "text-zinc-200"}>{i.qty} × {i.name}</span>
                  <span className="tabular-nums text-zinc-500">{formatNaira(i.qty * i.unitPrice)}</span>
                </li>
              ))}
            </ul>
            {o.note && <p className="mt-2 rounded-md bg-raised px-3 py-2 text-sm text-zinc-300">“{o.note}”</p>}
            {o.rejectReason && <p className="mt-2 text-xs text-zinc-500">Declined: {o.rejectReason}</p>}
            {o.voidReason && <p className="mt-2 text-xs text-red-400">Voided: {o.voidReason}</p>}
            {isOpen && (
              <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                {canAct && o.status === "pending" && (
                  <>
                    <Button size="sm" disabled={busy} onClick={() => run(() => api(`/api/orders/${o.id}/accept`, { body: {} }))}><Check size={14} /> Accept</Button>
                    <Button size="sm" variant="secondary" disabled={busy} onClick={() => setDialog({ kind: "reject", orderId: o.id })}><X size={14} /> Decline</Button>
                  </>
                )}
                {canAct && o.status === "accepted" && (
                  <Button size="sm" variant="secondary" disabled={busy} onClick={() => run(() => api(`/api/orders/${o.id}/serve`, { body: {} }))}><Utensils size={14} /> Mark served</Button>
                )}
                {manager && (o.status === "accepted" || o.status === "served") && (
                  <Button size="sm" variant="danger" disabled={busy} onClick={() => setDialog({ kind: "void", orderId: o.id })}>Void</Button>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>

      <ItemPicker open={picker} onClose={() => setPicker(false)} billId={bill.id} menu={menu} onSaved={() => router.refresh()} />

      <Modal open={paying} onClose={() => setPaying(false)} title="Close bill">
        <p className="text-sm text-muted">Amount to collect</p>
        <p className="mb-5 text-3xl font-semibold tabular-nums text-white">{formatNaira(bill.total)}</p>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">How did the customer pay?</p>
        <div className="grid grid-cols-3 gap-2">
          {METHODS.map((m) => (
            <button
              key={m.value}
              onClick={() => setMethod(m.value)}
              className={cx("flex flex-col items-center gap-2 rounded-lg border px-2 py-4 text-sm", method === m.value ? "border-accent bg-accent/10 text-white" : "border-line bg-raised text-zinc-300")}
            >
              <m.icon size={20} className={method === m.value ? "text-accent" : ""} />
              {m.label}
            </button>
          ))}
        </div>
        {method && <p className="mt-3 text-xs text-zinc-500">{METHODS.find((m) => m.value === method)?.hint}</p>}
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        <Button
          size="lg"
          className="mt-5 w-full"
          disabled={!method || busy}
          onClick={() =>
            run(async () => {
              await api(`/api/bills/${bill.id}/pay`, { body: { method } });
              setPaying(false);
            })
          }
        >
          {busy ? "Saving…" : "Confirm payment received"}
        </Button>
      </Modal>

      <Modal open={share} onClose={() => setShare(false)} title="Customer view">
        <p className="mb-4 text-sm text-muted">Let the customer scan this to follow their bill and order more from their phone.</p>
        <div className="mx-auto w-56 rounded-lg bg-white p-2" dangerouslySetInnerHTML={{ __html: customerQr }} />
        <p className="mt-4 break-all text-center font-mono text-xs text-zinc-500">{customerUrl}</p>
      </Modal>

      <ReasonDialog
        open={dialog !== null}
        title={dialog?.kind === "reject" ? "Decline order" : dialog?.kind === "void" ? "Void order" : "Void whole bill"}
        description={
          dialog?.kind === "reject"
            ? "The customer will see this reason."
            : "Stock for these items is returned and the staff member is notified. This is recorded against your name."
        }
        confirmLabel={dialog?.kind === "reject" ? "Decline" : "Void"}
        onClose={() => setDialog(null)}
        onConfirm={async (reason) => {
          if (!dialog) return;
          const url =
            dialog.kind === "voidBill" ? `/api/bills/${bill.id}/void` : `/api/orders/${dialog.orderId}/${dialog.kind}`;
          await api(url, { body: { reason } });
          router.refresh();
        }}
      />
    </>
  );
}
