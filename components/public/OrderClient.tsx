"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, ShoppingBag, Check } from "lucide-react";
import type { MenuCategory, MenuItem } from "@/lib/menu";
import { formatNaira } from "@/lib/money";
import { api, isNetworkError, randomId } from "@/lib/client";
import { Modal } from "../Modal";
import { CategoryTabs, categoryKey } from "../CategoryTabs";
import { Button, Field, Input, Select, Textarea, cx } from "../ui";

type Staff = { id: number; name: string };
type Mode =
  | { kind: "new"; tableToken: string; staff: Staff[] }
  | { kind: "add"; billToken: string; staffName: string };

export function billStorageKey(tableToken: string) {
  return `lounge:bill:${tableToken}`;
}

const catKey = categoryKey;

/**
 * Customer ordering: choose a server (new bill only), browse the menu one
 * category tab at a time, then review and send.
 */
export function OrderClient({ menu, mode, onPlaced }: { menu: MenuCategory[]; mode: Mode; onPlaced: (billToken: string) => void }) {
  const items = useMemo(() => new Map<number, MenuItem>(menu.flatMap((c) => c.items.map((i) => [i.id, i] as const))), [menu]);
  const [tab, setTab] = useState<string>(() => (menu[0] ? catKey(menu[0]) : ""));
  const [cart, setCart] = useState<Map<number, number>>(new Map());
  const [open, setOpen] = useState(false);
  const [staffId, setStaffId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // One id per order attempt: resending after a dropped connection can never create a duplicate.
  const [ref, setRef] = useState<string | null>(null);

  // If the selected tab disappears (menu changed live), fall back to the first one.
  const active = menu.find((c) => catKey(c) === tab) ?? menu[0];
  const lines = [...cart].map(([id, qty]) => ({ item: items.get(id)!, qty })).filter((l) => l.item);
  const count = lines.reduce((n, l) => n + l.qty, 0);
  const total = lines.reduce((n, l) => n + l.qty * l.item.price, 0);
  const inTab = (c: MenuCategory) => c.items.reduce((n, i) => n + (cart.get(i.id) ?? 0), 0);

  function setQty(id: number, qty: number) {
    setRef(null);
    setCart((prev) => {
      const next = new Map(prev);
      const item = items.get(id);
      const max = item?.remaining ?? 50;
      const clamped = Math.max(0, Math.min(qty, max, 50));
      if (clamped === 0) next.delete(id);
      else next.set(id, clamped);
      return next;
    });
  }

  async function submit() {
    setError("");
    if (mode.kind === "new" && !staffId) return setError("Please choose who is serving you.");
    setSubmitting(true);
    const attemptRef = ref ?? randomId();
    setRef(attemptRef);
    const body = {
      ...(mode.kind === "new"
        ? { tableToken: mode.tableToken, staffId, customerName: name || undefined }
        : { billToken: mode.billToken }),
      note: note || undefined,
      ref: attemptRef,
      items: lines.map((l) => ({ productId: l.item.id, qty: l.qty })),
    };
    try {
      let res: { billToken: string } | undefined;
      for (let attempt = 1; !res; attempt++) {
        try {
          res = await api<{ billToken: string }>("/api/public/orders", { body });
        } catch (e) {
          // Busy Wi-Fi: quietly resend the same order a couple of times before giving up.
          if (isNetworkError(e) && attempt < 3) {
            await new Promise((r) => setTimeout(r, 800 * attempt));
            continue;
          }
          if (isNetworkError(e)) throw new Error("Connection problem. Check your internet and tap Send again. You won't be charged twice.");
          throw e;
        }
      }
      setRef(null);
      setCart(new Map());
      setNote("");
      setOpen(false);
      onPlaced(res.billToken);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const selectedStaff = mode.kind === "new" ? mode.staff.find((s) => s.id === staffId)?.name : mode.staffName;
  const staffSelect =
    mode.kind === "new" &&
    (mode.staff.length === 0 ? (
      <p className="rounded-lg border border-amber-900 bg-amber-950/40 px-3 py-2 text-sm text-amber-200">No staff are available right now. Please call a waiter.</p>
    ) : (
      <Select
        aria-label="Who is serving you?"
        value={staffId ?? ""}
        onChange={(e) => setStaffId(e.target.value ? Number(e.target.value) : null)}
        className={cx("h-12 text-base", staffId ? "border-accent" : "")}
      >
        <option value="">Select your server…</option>
        {mode.staff.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </Select>
    ));

  return (
    <>
      {mode.kind === "new" && (
        <section className="mb-8">
          <StepHeading n={1} title="Who's serving you?" done={!!staffId} />
          {staffSelect}
          <p className="mt-2 text-xs text-zinc-500">Your order and bill go to this person. Pay only them.</p>
        </section>
      )}
      {mode.kind === "new" && <StepHeading n={2} title="Choose your drinks & food" />}

      {active && <CategoryTabs categories={menu} active={catKey(active)} onChange={setTab} counts={inTab} className="top-14" />}

      {active && (
        <ul role="tabpanel" aria-label={active.name} className="divide-y divide-line/70 pb-28">
          {active.items.map((item) => {
            const qty = cart.get(item.id) ?? 0;
            return (
              <li key={item.id} className="flex items-center justify-between gap-3 py-3.5">
                <div className="min-w-0">
                  <p className={cx("font-medium", item.soldOut ? "text-zinc-500" : "text-zinc-100")}>{item.name}</p>
                  {item.description && <p className="text-sm text-muted">{item.description}</p>}
                  <p className="mt-1 text-sm tabular-nums text-zinc-300">
                    {formatNaira(item.price)}
                    {item.remaining != null && item.remaining > 0 && item.remaining <= 5 && (
                      <span className="ml-2 text-xs text-amber-400">Only {item.remaining} left</span>
                    )}
                  </p>
                </div>
                {item.soldOut ? (
                  <span className="shrink-0 text-xs text-zinc-500">Sold out</span>
                ) : qty === 0 ? (
                  <Button variant="secondary" size="sm" onClick={() => setQty(item.id, 1)} aria-label={`Add ${item.name}`}>
                    <Plus size={14} /> Add
                  </Button>
                ) : (
                  <Stepper qty={qty} onChange={(q) => setQty(item.id, q)} label={item.name} />
                )}
              </li>
            );
          })}
        </ul>
      )}

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-black p-4">
          <div className="mx-auto max-w-3xl">
            <Button size="lg" className="w-full justify-between" onClick={() => setOpen(true)}>
              <span className="flex min-w-0 items-center gap-2">
                <ShoppingBag size={18} className="shrink-0" />
                <span className="truncate">{selectedStaff ? `Order for ${selectedStaff}` : "Review order"} · {count} item{count === 1 ? "" : "s"}</span>
              </span>
              <span className="tabular-nums">{formatNaira(total)}</span>
            </Button>
          </div>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Your order">
        <ul className="mb-5 divide-y divide-line">
          {lines.map(({ item, qty }) => (
            <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm text-zinc-100">{item.name}</p>
                <p className="text-xs tabular-nums text-muted">{formatNaira(item.price * qty)}</p>
              </div>
              <Stepper qty={qty} onChange={(q) => setQty(item.id, q)} label={item.name} />
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-4">
          {mode.kind === "new" ? (
            <>
              <Field label="Your server">{staffSelect}</Field>
              <Field label="Your name (optional)">
                <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="So your server can find you" />
              </Field>
            </>
          ) : (
            <p className="text-sm text-muted">
              Adding to your bill with <span className="text-white">{mode.staffName}</span>.
            </p>
          )}
          <Field label="Note (optional)">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="e.g. extra ice, no pepper" />
          </Field>
          {error && <p className="rounded-lg border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>}
          <Button size="lg" onClick={submit} disabled={submitting || count === 0}>
            {submitting ? "Sending…" : `Send order${selectedStaff ? ` to ${selectedStaff}` : ""} · ${formatNaira(total)}`}
          </Button>
        </div>
      </Modal>
    </>
  );
}

function StepHeading({ n, title, done }: { n: number; title: string; done?: boolean }) {
  return (
    <h2 className="mb-3 flex items-center gap-2.5 text-base font-semibold text-white">
      <span className={cx("flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold", done ? "bg-accent text-black" : "border border-accent text-accent")}>
        {done ? <Check size={13} /> : n}
      </span>
      {title}
    </h2>
  );
}

function Stepper({ qty, onChange, label }: { qty: number; onChange: (q: number) => void; label: string }) {
  return (
    <div className="flex shrink-0 items-center rounded-lg border border-line bg-raised">
      <button className="p-2 text-zinc-300 hover:text-white" onClick={() => onChange(qty - 1)} aria-label={`Remove one ${label}`}>
        <Minus size={14} />
      </button>
      <span className="w-6 text-center text-sm tabular-nums text-white">{qty}</span>
      <button className="p-2 text-zinc-300 hover:text-white" onClick={() => onChange(qty + 1)} aria-label={`Add one ${label}`}>
        <Plus size={14} />
      </button>
    </div>
  );
}
