"use client";

import { useState } from "react";
import type { MenuCategory } from "@/lib/menu";
import { formatNaira } from "@/lib/money";
import { api } from "@/lib/client";
import { Modal } from "../Modal";
import { Button, Textarea } from "../ui";
import { ItemSelector, cartLines, type Cart } from "./ItemSelector";

/** Staff adds items to an existing bill. Accepted immediately; stock is deducted on save. */
export function ItemPicker({ open, onClose, billId, menu, onSaved }: { open: boolean; onClose: () => void; billId: number; menu: MenuCategory[]; onSaved: () => void }) {
  const [cart, setCart] = useState<Cart>(new Map());
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const lines = cartLines(menu, cart);
  const total = lines.reduce((n, l) => n + l.qty * l.item.price, 0);

  async function save() {
    setError("");
    setSaving(true);
    try {
      await api(`/api/bills/${billId}/orders`, { body: { items: lines.map((l) => ({ productId: l.item.id, qty: l.qty })), note: note || undefined } });
      setCart(new Map());
      setNote("");
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add items" wide>
      <ItemSelector menu={menu} cart={cart} onChange={setCart} />
      {lines.length > 0 && (
        <div className="mt-4 rounded-lg border border-line bg-raised p-3 text-sm">
          {lines.map((l) => (
            <div key={l.item.id} className="flex justify-between py-0.5"><span>{l.qty} × {l.item.name}</span><span className="tabular-nums text-zinc-400">{formatNaira(l.qty * l.item.price)}</span></div>
          ))}
        </div>
      )}
      <Textarea className="mt-3" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" maxLength={300} />
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      <Button size="lg" className="mt-4 w-full" disabled={!lines.length || saving} onClick={save}>
        {saving ? "Saving…" : `Add to bill · ${formatNaira(total)}`}
      </Button>
    </Modal>
  );
}
