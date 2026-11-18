import type { Metadata } from "next";
import { asc, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories, products } from "@/lib/db/schema";
import { PageHeader } from "@/components/ui";
import { MenuManager } from "@/components/admin/MenuManager";

export const metadata: Metadata = { title: "Menu & stock" };

export default async function AdminMenuPage() {
  const [cats, items] = await Promise.all([
    db.select().from(categories).where(isNull(categories.deletedAt)).orderBy(asc(categories.sortOrder), asc(categories.name)),
    db.select().from(products).where(isNull(products.deletedAt)).orderBy(asc(products.name)),
  ]);
  return (
    <>
      <PageHeader title="Menu & stock" description="Prices and items customers see. Stock goes down automatically when an order is marked served." />
      <MenuManager categories={cats.map((c) => ({ id: c.id, name: c.name, sortOrder: c.sortOrder }))} products={items} />
    </>
  );
}
