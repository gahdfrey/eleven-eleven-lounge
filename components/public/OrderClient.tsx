"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, ShoppingBag, Check } from "lucide-react";
import type { MenuCategory, MenuItem } from "@/lib/menu";
import { formatNaira } from "@/lib/money";
import { api } from "@/lib/client";
import { Modal } from "../Modal";
import { Button, Field, Input, Textarea, cx } from "../ui";

type Staff = { id: number; name: string };
type Mode =
  | { kind: "new"; tableToken: string; staff: Staff[] }
  | { kind: "add"; billToken: string; staffName: string };

export function billStorageKey(tableToken: string) {
  return `lounge:bill:${tableToken}`;
}

export function OrderClient({ menu, mode, onPlaced }: { menu: MenuCategory[]; mode: Mode; onPlaced: (billToken: string) => void }) {
  const items = useMemo(() => new Map<number, MenuItem>(menu.flatMap((c) => c.items.map((i) => [i.id, i] as const))), [menu]);
  const [cart, setCart] = useState<Map<number, number>>(new Map());
  const [open, setOpen] = useState(false);
  const [staffId, setStaffId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [changingStaff, setChangingStaff] = useState(false);

  const lines = [...cart].map(([id, qty]) => ({ item: items.get(id)!, qty })).filter((l) => l.item);
  const count = lines.reduce((n, l) => n + l.qty, 0);
  const total = lines.reduce((n, l) => n + l.qty * l.item.price, 0);

  function setQty(id: number, qty: number) {
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
    try {
      const res = await api<{ billToken: string }>("/api/public/orders", {
        body: {
          ...(mode.kind === "new"
            ? { tableToken: mode.tableToken, staffId, customerName: name || undefined }
            : { billToken: mode.billToken }),
          note: note || undefined,
          items: lines.map((l) => ({ productId: l.item.id, qty: l.qty })),
        },
      });
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

  return (
    <>
      {mode.kind === "new" && (
        <section className="mb-8">
          <StepHeading n={1} title="Who's serving you?" done={!!staffId} />
          {mode.staff.length === 0 ? (
            <p className="rounded-lg border border-amber-900 bg-amber-950/40 px-3 py-2 text-sm text-amber-200">No staff are on the system yet. Please call a waiter.</p>
          ) : (
            <StaffGrid staff={mode.staff} value={staffId} onChange={setStaffId} />
          )}
          <p className="mt-2 text-xs text-zinc-500">Your order and bill go to this person. Pay only them.</p>
        </section>
      )}
      {mode.kind === "new" && <StepHeading n={2} title="Choose your drinks & food" />}
      {menu.length > 1 && (
        <nav className="sticky top-14 z-20 -mx-4 mb-4 flex gap-2 overflow-x-auto border-b border-line bg-black px-4 py-3">
          {menu.map((c) => (
            <a key={c.id ?? "other"} href={`#cat-${c.id ?? "other"}`} className="shrink-0 rounded-full border border-line px-3 py-1 text-sm text-zinc-300 hover:border-accent hover:text-white">
              {c.name}
            </a>
          ))}
        </nav>
      )}

      <div className="flex flex-col gap-8 pb-28">
        {menu.map((c) => (
          <section key={c.id ?? "other"} id={`cat-${c.id ?? "other"}`} className="scroll-mt-32">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent">{c.name}</h2>
            <ul className="divide-y divide-line/70">
              {c.items.map((item) => {
                const qty = cart.get(item.id) ?? 0;
                return (
                  <li key={item.id} className="flex items-center justify-between gap-3 py-3">
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
          </section>
        ))}
      </div>

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-black p-4">
          <div className="mx-auto max-w-3xl">
            <Button size="lg" className="w-full justify-between" onClick={() => setOpen(true)}>
              <span className="flex items-center gap-2">
                <ShoppingBag size={18} /> {selectedStaff ? `Order for ${selectedStaff}` : "Review order"} · {count} item{count === 1 ? "" : "s"}
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
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Your server</p>
                {staffId && !changingStaff ? (
                  <div className="flex items-center justify-between rounded-lg border border-accent bg-accent/10 px-3 py-2.5 text-sm text-white">
                    {selectedStaff}
                    <button type="button" className="text-xs text-accent hover:underline" onClick={() => setChangingStaff(true)}>Change</button>
                  </div>
                ) : mode.staff.length === 0 ? (
                  <p className="text-sm text-amber-400">No staff are available right now. Please call a waiter.</p>
                ) : (
                  <StaffGrid staff={mode.staff} value={staffId} onChange={(id) => { setStaffId(id); setChangingStaff(false); }} />
                )}
              </div>
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

function StaffGrid({ staff, value, onChange }: { staff: Staff[]; value: number | null; onChange: (id: number) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {staff.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onChange(s.id)}
          aria-pressed={value === s.id}
          className={cx(
            "flex items-center justify-between rounded-lg border px-3 py-3 text-left text-sm transition-colors",
            value === s.id ? "border-accent bg-accent/10 text-white" : "border-line bg-raised text-zinc-300 hover:border-zinc-600",
          )}
        >
          {s.name}
          {value === s.id && <Check size={14} className="text-accent" />}
        </button>
      ))}
    </div>
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
