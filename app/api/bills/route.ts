import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { bills, loungeTables } from "@/lib/db/schema";
import { AppError, handle, parseBody } from "@/lib/api";
import { requireUser, SERVICE } from "@/lib/authz";
import { createOrder } from "@/lib/orders";
import { randomToken } from "@/lib/tokens";

const schema = z.object({
  tableId: z.number().int().positive().nullable().optional(),
  customerName: z.string().trim().max(60).optional(),
  note: z.string().trim().max(300).optional(),
  /** Optional first order; accepted immediately and stock deducted. */
  items: z
    .array(z.object({ productId: z.number().int().positive(), qty: z.number().int().min(1).max(100) }))
    .max(60)
    .optional(),
});

/** Staff opens a bill (walk-up customer, no QR). The bill and its orders are always theirs. */
export const POST = handle(async (request: Request) => {
  const user = await requireUser(SERVICE);
  const { data, error } = await parseBody(request, schema);
  if (error) return error;
  if (data.tableId) {
    const [t] = await db
      .select({ id: loungeTables.id })
      .from(loungeTables)
      .where(and(eq(loungeTables.id, data.tableId), isNull(loungeTables.deletedAt)));
    if (!t) throw new AppError("Table not found", 404);
  }
  const newBill = { staffId: user.id, tableId: data.tableId ?? null, customerName: data.customerName };
  if (data.items?.length) {
    // Bill and first order are created together: if the order fails (e.g. out of stock), no empty bill is left.
    const result = await createOrder({ bill: { create: newBill }, source: "staff", lines: data.items, note: data.note, actor: user });
    return NextResponse.json({ id: result.billId }, { status: 201 });
  }
  const [bill] = await db
    .insert(bills)
    .values({ ...newBill, customerName: newBill.customerName || null, accessToken: randomToken(16) })
    .returning({ id: bills.id });
  return NextResponse.json({ id: bill.id }, { status: 201 });
});
