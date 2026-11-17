import { NextResponse } from "next/server";
import { z } from "zod";
import { productSchema } from "@/lib/schemas";
import { db } from "@/lib/db";
import { products, stockMovements } from "@/lib/db/schema";
import { handle, parseBody } from "@/lib/api";
import { MANAGERS, requireUser } from "@/lib/authz";


export const POST = handle(async (request: Request) => {
  const user = await requireUser(MANAGERS);
  const { data, error } = await parseBody(
    request,
    productSchema.extend({ openingStock: z.number().int().min(0).max(1_000_000).optional() }),
  );
  if (error) return error;
  const { openingStock = 0, ...values } = data;
  const product = await db.transaction(async (tx) => {
    const [p] = await tx.insert(products).values({ ...values, stockQty: openingStock }).returning();
    if (openingStock > 0) {
      await tx.insert(stockMovements).values({
        productId: p.id,
        change: openingStock,
        balanceAfter: openingStock,
        reason: "restock",
        note: "Opening stock",
        userId: user.id,
      });
    }
    return p;
  });
  return NextResponse.json({ product }, { status: 201 });
});
