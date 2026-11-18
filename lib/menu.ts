import { and, asc, eq, gte, isNull, or } from "drizzle-orm";
import { db } from "./db";
import { categories, events, products, users } from "./db/schema";
import { displayName } from "./users";
import { reservedQty } from "./orders";

export type MenuItem = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  soldOut: boolean;
  remaining: number | null;
};
export type MenuCategory = { id: number | null; name: string; items: MenuItem[] };

/** The customer-facing menu: available items grouped by category, with sold-out flags. */
export async function getMenu(): Promise<MenuCategory[]> {
  const [cats, items, reserved] = await Promise.all([
    db.select().from(categories).where(isNull(categories.deletedAt)).orderBy(asc(categories.sortOrder), asc(categories.name)),
    db
      .select()
      .from(products)
      .where(and(isNull(products.deletedAt), eq(products.available, true)))
      .orderBy(asc(products.name)),
    reservedQty(),
  ]);
  // What can still be ordered = on the shelf minus what accepted orders are waiting to be served.
  const toItem = (p: (typeof items)[number]): MenuItem => {
    const free = Math.max(0, p.stockQty - (reserved.get(p.id) ?? 0));
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      soldOut: p.trackStock && free <= 0,
      remaining: p.trackStock ? free : null,
    };
  };
  const grouped: MenuCategory[] = cats
    .map((c) => ({ id: c.id, name: c.name, items: items.filter((p) => p.categoryId === c.id).map(toItem) }))
    .filter((c) => c.items.length > 0);
  const known = new Set(cats.map((c) => c.id));
  const other = items.filter((p) => p.categoryId == null || !known.has(p.categoryId)).map(toItem);
  if (other.length) grouped.push({ id: null, name: "Other", items: other });
  return grouped;
}

/** Published events that haven't finished yet, soonest first. */
export async function getUpcomingEvents(limit = 50) {
  const now = new Date();
  return db
    .select()
    .from(events)
    .where(
      and(
        isNull(events.deletedAt),
        eq(events.published, true),
        or(gte(events.endsAt, now), and(isNull(events.endsAt), gte(events.startsAt, new Date(now.getTime() - 6 * 3600_000)))),
      ),
    )
    .orderBy(asc(events.startsAt))
    .limit(limit);
}

/** Who a customer can pick as their server: active accounts with the "staff" role only. */
export async function getActiveStaff() {
  const rows = await db
    .select({ id: users.id, firstname: users.firstname, lastname: users.lastname, role: users.role })
    .from(users)
    .where(and(eq(users.active, true), isNull(users.deletedAt), eq(users.role, "staff")))
    .orderBy(asc(users.firstname));
  return rows.map((r) => ({ id: r.id, name: displayName(r) }));
}
