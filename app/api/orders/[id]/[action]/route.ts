import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError, handle, parseBody, parseId } from "@/lib/api";
import { requireUser, SERVICE } from "@/lib/authz";
import { acceptOrder, markServed, rejectOrder, voidOrder } from "@/lib/orders";

const reasonSchema = z.object({ reason: z.string().trim().min(3, "Give a short reason").max(200) });

/** POST /api/orders/:id/accept | reject | serve | void */
export const POST = handle(async (request: Request, ctx: { params: Promise<{ id: string; action: string }> }) => {
  const { id: rawId, action } = await ctx.params;
  const id = parseId(rawId);
  const user = await requireUser(SERVICE);

  switch (action) {
    case "accept":
      await acceptOrder(id, user);
      break;
    case "serve":
      await markServed(id, user);
      break;
    case "reject":
    case "void": {
      const { data, error } = await parseBody(request, reasonSchema);
      if (error) return error;
      if (action === "reject") await rejectOrder(id, user, data.reason);
      else await voidOrder(id, user, data.reason);
      break;
    }
    default:
      throw new AppError("Not found", 404);
  }
  return NextResponse.json({ ok: true });
});
