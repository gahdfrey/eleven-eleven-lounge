import { sql } from "drizzle-orm";
import { db } from "./db";

/**
 * A cheap fingerprint of everything that affects money and stock on screen.
 * It changes whenever an order, bill, payment, stock movement, remittance,
 * menu item, user, table, event, reservation or notification changes. Clients poll it and
 * redraw on change. Every part is an indexed max(), so it stays fast as data grows.
 */
export async function changeFingerprint(scope: "staff" | "public" = "staff") {
  const query =
    scope === "public"
      ? sql`select concat_ws('|',
          (select max(updated_at) from products),
          (select max(updated_at) from categories),
          (select max(updated_at) from events)
        ) as v`
      : sql`select concat_ws('|',
          (select max(updated_at) from bills),
          (select max(updated_at) from orders),
          (select max(updated_at) from products),
          (select max(id) from stock_movements),
          (select max(id) from remittances),
          (select max(id) from notifications),
          (select max(updated_at) from users),
          (select max(updated_at) from lounge_tables),
          (select max(updated_at) from categories),
          (select max(updated_at) from events),
          (select max(updated_at) from reservations)
        ) as v`;
  const rows = (await db.execute(query)) as unknown as { v: string | null }[];
  return rows[0]?.v ?? "";
}
