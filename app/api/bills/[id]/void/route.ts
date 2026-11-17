import { NextResponse } from "next/server";
import { z } from "zod";
import { handle, parseBody, parseId } from "@/lib/api";
import { MANAGERS, requireUser } from "@/lib/authz";
import { voidBill } from "@/lib/orders";

const schema = z.object({ reason: z.string().trim().min(3, "Give a short reason").max(200) });

export const POST = handle(async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser(MANAGERS);
  const billId = parseId((await ctx.params).id);
  const { data, error } = await parseBody(request, schema);
  if (error) return error;
  await voidBill(billId, user, data.reason);
  return NextResponse.json({ ok: true });
});
