import { NextResponse } from "next/server";
import { z } from "zod";
import { handle, parseBody, parseId } from "@/lib/api";
import { requireUser } from "@/lib/authz";
import { createOrder } from "@/lib/orders";

const schema = z.object({
  note: z.string().trim().max(300).optional(),
  items: z
    .array(z.object({ productId: z.number().int().positive(), qty: z.number().int().min(1).max(100) }))
    .min(1, "Add at least one item")
    .max(60),
});

/** Staff adds items to their own bill; accepted immediately and stock deducted. */
export const POST = handle(async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const billId = parseId((await ctx.params).id);
  const { data, error } = await parseBody(request, schema);
  if (error) return error;
  const result = await createOrder({ bill: { id: billId }, source: "staff", lines: data.items, note: data.note, actor: user });
  return NextResponse.json({ id: result.orderId }, { status: 201 });
});
