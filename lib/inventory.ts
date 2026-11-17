import { eq, sql } from "drizzle-orm";
import { db } from "./db";
import { products, stockMovements, type StockReason } from "./db/schema";
import { AppError } from "./api";

/**
 * Manual stock change (restock, count adjustment, breakage/waste). Every
 * change is written to the stock ledger with who did it and why.
 */
export async function adjustStock(input: {
  productId: number;
  change: number;
  reason: Exclude<StockReason, "sale" | "void">;
  note?: string | null;
  userId: number;
}) {
  if (input.change === 0) throw new AppError("Enter a quantity.");
  return db.transaction(async (tx) => {
    const [p] = await tx.select().from(products).where(eq(products.id, input.productId)).for("update");
    if (!p || p.deletedAt) throw new AppError("Product not found", 404);
    if (p.stockQty + input.change < 0) {
      throw new AppError(`Only ${p.stockQty} in stock; you can't remove ${-input.change}.`, 409);
    }
    const [updated] = await tx
      .update(products)
      .set({ stockQty: sql`${products.stockQty} + ${input.change}`, trackStock: true })
      .where(eq(products.id, p.id))
      .returning({ stockQty: products.stockQty });
    await tx.insert(stockMovements).values({
      productId: p.id,
      change: input.change,
      balanceAfter: updated.stockQty,
      reason: input.reason,
      note: input.note || null,
      userId: input.userId,
    });
    return updated.stockQty;
  });
}
