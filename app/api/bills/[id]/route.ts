import { NextResponse } from "next/server";
import { AppError, handle, parseId } from "@/lib/api";
import { isManager, requireUser } from "@/lib/authz";
import { getBillDetail } from "@/lib/orders";

export const GET = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const bill = await getBillDetail({ id: parseId((await ctx.params).id) });
  if (!bill) throw new AppError("Bill not found", 404);
  if (bill.staffId !== user.id && !isManager(user)) throw new AppError("This bill belongs to another staff member.", 403);
  return NextResponse.json({ bill });
});
