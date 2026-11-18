"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import type { MenuCategory } from "@/lib/menu";
import { api } from "@/lib/client";
import { formatNaira } from "@/lib/money";
import { Button, Card, Field, Input, Select, Textarea } from "../ui";
import { ItemSelector, cartLines, type Cart } from "./ItemSelector";

type OpenBill = { id: number; label: string; total: number };

/** Staff raises an order for a customer who isn't using the QR code. The bill is theirs. */
export function NewOrderForm({ menu, tables, openBills, staffName }: { menu: MenuCategory[]; tables: { id: number; name: string }[]; openBills: OpenBill[]; staffName: string }) {
  const router = useRouter();
  const [cart, setCart] = useState<Cart>(new Map());
  const [tableId, setTableId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [note, setNote] = useState("");
  const [target, setTarget] = useState<string>("new");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const lines = cartLines(menu, cart);
  const total = lines.reduce((n, l) => n + l.qty * l.item.price, 0);

  function bump(id: number, delta: number, max: number | null) {
    const next = new Map(cart);
    const v = Math.max(0, Math.min((next.get(id) ?? 0) + delta, max ?? 100, 100));
    if (v) next.set(id, v);
    else next.delete(id);
    setCart(next);
  }

  async function submit() {
    setError("");
    setSaving(true);
    const items = lines.map((l) => ({ productId: l.item.id, qty: l.qty }));
    try {
      if (target === "new") {
        const res = await api<{ id: number }>("/api/bills", {
          body: { tableId: tableId ? Number(tableId) : null, customerName: customerName || undefined, note: note || undefined, items },
        });
        router.push(`/bills/${res.id}`);
      } else {
        await api(`/api/bills/${target}/orders`, { body: { items, note: note || undefined } });
        router.push(`/bills/${target}`);
      }
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <section>
        <h2 className="mb-3 font-semibold text-white">Items</h2>
        <ItemSelector menu={menu} cart={cart} onChange={setCart} listClassName="max-h-[60vh]" />
      </section>

      <Card className="h-fit p-5 xl:sticky xl:top-20">
        <h2 className="mb-4 font-semibold text-white">Order</h2>

        {openBills.length > 0 && (
          <Field label="Put on">
            <Select value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="new">A new bill</option>
              {openBills.map((b) => (
                <option key={b.id} value={b.id}>Open bill #{b.id} · {b.label} · {formatNaira(b.total)}</option>
              ))}
            </Select>
          </Field>
        )}

        {target === "new" && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Field label="Table">
              <Select value={tableId} onChange={(e) => setTableId(e.target.value)}>
                <option value="">Walk-in / bar</option>
                {tables.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </Field>
            <Field label="Customer (optional)">
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} maxLength={60} />
            </Field>
          </div>
        )}

        <div className="mt-5 border-t border-line pt-4">
          {lines.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted">Tap items on the menu to add them.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {lines.map(({ item, qty }) => (
                <li key={item.id} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 flex-1 truncate text-zinc-200">{item.name}</span>
                  <div className="flex items-center rounded-md border border-line bg-raised">
                    <button type="button" className="p-1.5 text-zinc-400" onClick={() => bump(item.id, -1, item.remaining)} aria-label={`Less ${item.name}`}>{qty === 1 ? <Trash2 size={13} /> : <Minus size={13} />}</button>
                    <span className="w-5 text-center tabular-nums">{qty}</span>
                    <button type="button" className="p-1.5 text-zinc-400" onClick={() => bump(item.id, 1, item.remaining)} aria-label={`More ${item.name}`}><Plus size={13} /></button>
                  </div>
                  <span className="w-20 text-right tabular-nums text-zinc-400">{formatNaira(qty * item.price)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
            <span className="text-sm text-muted">Total</span>
            <span className="text-xl font-semibold tabular-nums text-white">{formatNaira(total)}</span>
          </div>
        </div>

        <Textarea className="mt-4" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" maxLength={300} />
        {error && <p className="mt-3 rounded-lg border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>}
        <Button size="lg" className="mt-4 w-full" disabled={!lines.length || saving} onClick={submit}>
          {saving ? "Saving…" : target === "new" ? `Place order · ${formatNaira(total)}` : `Add to bill #${target} · ${formatNaira(total)}`}
        </Button>
        <p className="mt-3 text-center text-xs text-zinc-500">
          Recorded under <span className="text-zinc-300">{staffName}</span>. Stock is taken out when you mark it served; record payment when the customer pays.
        </p>
        <p className="mt-2 text-center text-xs"><Link href="/orders" className="text-muted hover:text-white">Cancel</Link></p>
      </Card>
    </div>
  );
}
