"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, Search } from "lucide-react";
import type { MenuCategory } from "@/lib/menu";
import { formatNaira } from "@/lib/money";
import { Input, cx } from "../ui";
import { CategoryTabs, categoryKey } from "../CategoryTabs";

export type Cart = Map<number, number>;

/** Searchable menu with quantity steppers. Controlled: the parent owns the cart. */
export function ItemSelector({ menu, cart, onChange, listClassName }: { menu: MenuCategory[]; cart: Cart; onChange: (c: Cart) => void; listClassName?: string }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>(() => (menu[0] ? categoryKey(menu[0]) : ""));
  const all = useMemo(() => menu.flatMap((c) => c.items.map((i) => ({ ...i, category: c.name, catKey: categoryKey(c) }))), [menu]);
  // Fall back to the first tab if the selected category disappears (menu changed live).
  const activeCat = menu.some((c) => categoryKey(c) === cat) ? cat : menu[0] ? categoryKey(menu[0]) : "";
  // Searching looks across every category; otherwise only the selected tab's items show.
  const filtered = all.filter((i) => (q ? i.name.toLowerCase().includes(q.toLowerCase()) : i.catKey === activeCat));
  const inCart = (c: MenuCategory) => c.items.reduce((n, i) => n + (cart.get(i.id) ?? 0), 0);

  function setQty(id: number, qty: number, max: number | null) {
    const next = new Map(cart);
    const v = Math.max(0, Math.min(qty, max ?? 100, 100));
    if (v) next.set(id, v);
    else next.delete(id);
    onChange(next);
  }

  return (
    <div>
      <div className="relative mb-2">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the menu" className="pl-9" />
      </div>
      {!q && menu.length > 0 && (
        <div className="px-4">
          <CategoryTabs categories={menu} active={activeCat} onChange={setCat} counts={inCart} />
        </div>
      )}
      <ul className={cx("divide-y divide-line overflow-y-auto rounded-lg border border-line", listClassName ?? "max-h-[45vh]")}>
        {filtered.map((i) => {
          const qty = cart.get(i.id) ?? 0;
          return (
            <li key={i.id} className={cx("flex items-center justify-between gap-3 px-3 py-2.5", i.soldOut && "opacity-50", qty > 0 && "bg-accent/5")}>
              <button type="button" className="min-w-0 flex-1 text-left" disabled={i.soldOut} onClick={() => setQty(i.id, qty + 1, i.remaining)}>
                <p className="truncate text-sm text-white">{i.name}</p>
                <p className="text-xs text-muted">
                  {formatNaira(i.price)}{q && ` · ${i.category}`}
                  {i.remaining != null && <span className={i.remaining <= 0 ? "text-red-400" : ""}> · {i.remaining} in stock</span>}
                </p>
              </button>
              {i.soldOut ? (
                <span className="text-xs text-zinc-500">Sold out</span>
              ) : (
                <div className="flex items-center rounded-lg border border-line bg-raised">
                  <button type="button" className="p-2 text-zinc-300 disabled:opacity-30" disabled={!qty} onClick={() => setQty(i.id, qty - 1, i.remaining)} aria-label={`Less ${i.name}`}><Minus size={14} /></button>
                  <span className="w-6 text-center text-sm tabular-nums">{qty}</span>
                  <button type="button" className="p-2 text-zinc-300" onClick={() => setQty(i.id, qty + 1, i.remaining)} aria-label={`More ${i.name}`}><Plus size={14} /></button>
                </div>
              )}
            </li>
          );
        })}
        {filtered.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">No matching items</li>}
      </ul>
    </div>
  );
}

export function cartLines(menu: MenuCategory[], cart: Cart) {
  const items = menu.flatMap((c) => c.items);
  return [...cart].map(([id, qty]) => ({ item: items.find((i) => i.id === id)!, qty })).filter((l) => l.item);
}
