import { NextResponse } from "next/server";
import { z } from "zod";
import { handle, parseBody, parseId } from "@/lib/api";
import { requireUser, SERVICE } from "@/lib/authz";
import { PAYMENT_METHODS } from "@/lib/db/schema";
import { payBill } from "@/lib/orders";

const schema = z.object({ method: z.enum(PAYMENT_METHODS, "Choose how the customer paid") });

export const POST = handle(async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser(SERVICE);
  const billId = parseId((await ctx.params).id);
  const { data, error } = await parseBody(request, schema);
  if (error) return error;
  const total = await payBill(billId, user, data.method);
  return NextResponse.json({ ok: true, total });
});
