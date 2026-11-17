import { NextResponse } from "next/server";
import { z } from "zod";
import { handle, parseBody, parseId } from "@/lib/api";
import { MANAGERS, requireUser } from "@/lib/authz";
import { adjustStock } from "@/lib/inventory";

const schema = z.object({
  change: z.number().int().min(-100000).max(100000),
  reason: z.enum(["restock", "adjustment", "waste"]),
  note: z.string().trim().max(200).optional(),
});

export const POST = handle(async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser(MANAGERS);
  const productId = parseId((await ctx.params).id);
  const { data, error } = await parseBody(request, schema);
  if (error) return error;
  const change = data.reason === "waste" ? -Math.abs(data.change) : data.reason === "restock" ? Math.abs(data.change) : data.change;
  const stockQty = await adjustStock({ productId, change, reason: data.reason, note: data.note, userId: user.id });
  return NextResponse.json({ stockQty });
});
