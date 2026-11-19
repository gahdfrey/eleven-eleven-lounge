"use client";

import { useState } from "react";
import type { MenuCategory } from "@/lib/menu";
import { formatNaira } from "@/lib/money";
import { CategoryTabs, categoryKey } from "../CategoryTabs";
import { EmptyState } from "../ui";

/** Read-only menu (the /menu page), one category tab at a time. Ordering happens from a table QR code. */
export function MenuView({ categories, stickyTop = "top-14" }: { categories: MenuCategory[]; stickyTop?: string }) {
  const [tab, setTab] = useState(() => (categories[0] ? categoryKey(categories[0]) : ""));
  if (categories.length === 0) return <EmptyState title="Menu coming soon" description="Check back shortly." />;
  const active = categories.find((c) => categoryKey(c) === tab) ?? categories[0];

  return (
    <div>
      <CategoryTabs categories={categories} active={categoryKey(active)} onChange={setTab} className={stickyTop} />
      <ul role="tabpanel" aria-label={active.name} className="divide-y divide-line/70">
        {active.items.map((item) => (
          <li key={item.id} className="flex items-start justify-between gap-4 py-3.5">
            <div>
              <p className={item.soldOut ? "text-zinc-500 line-through" : "text-zinc-100"}>{item.name}</p>
              {item.description && <p className="mt-0.5 text-sm text-muted">{item.description}</p>}
            </div>
            <p className="shrink-0 tabular-nums text-zinc-200">{item.soldOut ? <span className="text-xs text-zinc-500">Sold out</span> : formatNaira(item.price)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
