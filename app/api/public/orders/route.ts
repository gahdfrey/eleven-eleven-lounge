import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { bills, loungeTables, users } from "@/lib/db/schema";
import { AppError, handle, parseBody } from "@/lib/api";
import { createOrder } from "@/lib/orders";
import { randomToken } from "@/lib/tokens";

const schema = z.object({
  /** Existing bill to add to (the customer's saved bill link). */
  billToken: z.string().min(8).max(64).optional(),
  /** Table QR token — required when starting a new bill. */
  tableToken: z.string().min(8).max(64).optional(),
  staffId: z.number().int().positive().optional(),
  customerName: z.string().trim().max(60).optional(),
  customerPhone: z.string().trim().max(20).optional(),
  note: z.string().trim().max(300).optional(),
  items: z
    .array(z.object({ productId: z.number().int().positive(), qty: z.number().int().min(1).max(50) }))
    .min(1, "Add at least one item")
    .max(40),
});

/** Customer places an order from a table QR code. A new bill is opened against the staff they pick. */
export const POST = handle(async (request: Request) => {
  const { data, error } = await parseBody(request, schema);
  if (error) return error;

  let billId: number;
  let accessToken: string;

  if (data.billToken) {
    const [bill] = await db.select().from(bills).where(eq(bills.accessToken, data.billToken)).limit(1);
    if (!bill) throw new AppError("We couldn't find your bill. Please scan the table QR code again.", 404);
    if (bill.status !== "open") throw new AppError("This bill is closed. Start a new order from the table QR code.", 409);
    billId = bill.id;
    accessToken = bill.accessToken;
  } else {
    if (!data.tableToken) throw new AppError("Please scan the QR code on your table to order.");
    if (!data.staffId) throw new AppError("Please choose who is serving you.");
    const [table] = await db
      .select()
      .from(loungeTables)
      .where(and(eq(loungeTables.qrToken, data.tableToken), eq(loungeTables.active, true), isNull(loungeTables.deletedAt)))
      .limit(1);
    if (!table) throw new AppError("This QR code is no longer active. Please ask a staff member.", 404);
    const [staff] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(eq(users.id, data.staffId), eq(users.active, true), isNull(users.deletedAt), eq(users.role, "staff")),
      )
      .limit(1);
    if (!staff) throw new AppError("That staff member isn't available. Please choose another.", 409);

    accessToken = randomToken(16);
    const [bill] = await db
      .insert(bills)
      .values({
        staffId: staff.id,
        tableId: table.id,
        customerName: data.customerName || null,
        customerPhone: data.customerPhone || null,
        accessToken,
      })
      .returning({ id: bills.id });
    billId = bill.id;
  }

  try {
    await createOrder({ billId, source: "customer", lines: data.items, note: data.note });
  } catch (err) {
    // Don't leave an empty bill behind if the very first order failed (e.g. sold out).
    if (!data.billToken) await db.delete(bills).where(eq(bills.id, billId));
    throw err;
  }
  return NextResponse.json({ billToken: accessToken }, { status: 201 });
});
