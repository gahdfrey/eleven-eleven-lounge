"use client";

import { useState } from "react";
import { Banknote, CreditCard, Landmark } from "lucide-react";
import { api } from "@/lib/client";
import { formatNaira } from "@/lib/money";
import { Modal } from "../Modal";
import { Button, cx } from "../ui";

const METHODS = [
  { value: "cash", label: "Cash", icon: Banknote, hint: "You must hand this cash over to a manager." },
  { value: "transfer", label: "Transfer", icon: Landmark, hint: "Confirm it has landed in the lounge account first." },
  { value: "pos", label: "POS / card", icon: CreditCard, hint: "Use the lounge POS terminal." },
] as const;

/** Records how a bill was paid. Anything not yet marked served is served (and taken out of stock) at the same time. */
export function PayBillDialog({ billId, total, open, onClose, onPaid }: { billId: number; total: number; open: boolean; onClose: () => void; onPaid: () => void }) {
  const [method, setMethod] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      await api(`/api/bills/${billId}/pay`, { body: { method } });
      setMethod(null);
      onPaid();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Record payment · Bill #${billId}`}>
      <p className="text-sm text-muted">Amount to collect</p>
      <p className="mb-5 text-3xl font-semibold tabular-nums text-white">{formatNaira(total)}</p>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">How did the customer pay?</p>
      <div className="grid grid-cols-3 gap-2">
        {METHODS.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => setMethod(m.value)}
            className={cx("flex flex-col items-center gap-2 rounded-lg border px-2 py-4 text-sm", method === m.value ? "border-accent bg-accent/10 text-white" : "border-line bg-raised text-zinc-300")}
          >
            <m.icon size={20} className={method === m.value ? "text-accent" : ""} />
            {m.label}
          </button>
        ))}
      </div>
      {method && <p className="mt-3 text-xs text-zinc-500">{METHODS.find((m) => m.value === method)?.hint}</p>}
      <p className="mt-3 text-xs text-zinc-500">Items not yet marked served will be marked served now.</p>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      <Button size="lg" className="mt-5 w-full" disabled={!method || busy} onClick={confirm}>
        {busy ? "Saving…" : `Confirm ${formatNaira(total)} received`}
      </Button>
    </Modal>
  );
}
