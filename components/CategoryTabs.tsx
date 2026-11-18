"use client";

import type { MenuCategory } from "@/lib/menu";
import { cx } from "./ui";

export const categoryKey = (c: Pick<MenuCategory, "id">) => String(c.id ?? "other");

/** One tab per menu category; the page shows only the selected category's items. */
export function CategoryTabs({
  categories,
  active,
  onChange,
  counts,
  className,
}: {
  categories: MenuCategory[];
  active: string;
  onChange: (key: string) => void;
  /** Optional badge per tab, e.g. how many of its items are in the cart. */
  counts?: (c: MenuCategory) => number;
  /** Sticky offset, e.g. "top-14" under a page header. Omit to not stick. */
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label="Menu categories"
      className={cx("-mx-4 mb-2 flex gap-1 overflow-x-auto border-b border-line bg-black px-4", className && `sticky z-20 ${className}`)}
    >
      {categories.map((c) => {
        const key = categoryKey(c);
        const selected = key === active;
        const n = counts?.(c) ?? 0;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(key)}
            className={cx(
              "shrink-0 border-b-2 px-3 py-3 text-sm font-medium transition-colors",
              selected ? "border-accent text-white" : "border-transparent text-zinc-500 hover:text-zinc-200",
            )}
          >
            {c.name}
            {n > 0 && <span className="ml-1.5 rounded-full bg-accent px-1.5 text-[10px] font-bold text-black">{n}</span>}
          </button>
        );
      })}
    </div>
  );
}
