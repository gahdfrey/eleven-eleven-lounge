import type { MenuCategory } from "@/lib/menu";
import { formatNaira } from "@/lib/money";
import { EmptyState } from "../ui";

/** Read-only menu (the /menu page). Ordering happens from a table QR code. */
export function MenuView({ categories }: { categories: MenuCategory[] }) {
  if (categories.length === 0) return <EmptyState title="Menu coming soon" description="Check back shortly." />;
  return (
    <div className="flex flex-col gap-10">
      {categories.map((c) => (
        <section key={c.id ?? "other"}>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-accent">{c.name}</h2>
          <ul className="divide-y divide-line/70 border-y border-line/70">
            {c.items.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-4 py-3">
                <div>
                  <p className={item.soldOut ? "text-zinc-500 line-through" : "text-zinc-100"}>{item.name}</p>
                  {item.description && <p className="mt-0.5 text-sm text-muted">{item.description}</p>}
                </div>
                <p className="shrink-0 tabular-nums text-zinc-200">{item.soldOut ? <span className="text-xs text-zinc-500">Sold out</span> : formatNaira(item.price)}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
