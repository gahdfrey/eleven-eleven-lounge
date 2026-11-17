"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { formatNaira, fromKobo, toKobo } from "@/lib/money";
import { Modal } from "../Modal";
import { Button, Field, Input } from "../ui";

export function RemitButton({ staffId, staffName, owed }: { staffId: number; staffName: string; owed: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const amount = toKobo(String(f.get("amount")));
    if (!(amount > 0)) return setError("Enter the amount received");
    setBusy(true);
    setError("");
    try {
      await api("/api/remittances", { body: { staffId, amount, note: String(f.get("note") || "") || undefined } });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button size="sm" variant={owed > 0 ? "primary" : "ghost"} onClick={() => setOpen(true)}>Receive cash</Button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Cash from ${staffName}`}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-muted">They currently owe <span className="font-semibold text-white">{formatNaira(owed)}</span> in cash.</p>
          <Field label="Amount received (₦)"><Input name="amount" inputMode="decimal" defaultValue={owed > 0 ? fromKobo(owed) : ""} required autoFocus /></Field>
          <Field label="Note (optional)"><Input name="note" maxLength={200} placeholder="e.g. end of shift" /></Field>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button size="lg" disabled={busy}>{busy ? "Saving…" : "Record remittance"}</Button>
        </form>
      </Modal>
    </>
  );
}
