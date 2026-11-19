import { NextResponse } from "next/server";
import { handle, parseBody, parseId } from "@/lib/api";
import { SERVICE, requireUser } from "@/lib/authz";
import { reservationUpdateSchema, updateReservation } from "@/lib/reservations";

/** Confirm, seat, complete, cancel or mark a no-show; assign a table; move the time. */
export const PATCH = handle(async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser(SERVICE);
  const id = parseId((await ctx.params).id);
  const { data, error } = await parseBody(request, reservationUpdateSchema);
  if (error) return error;
  const reservation = await updateReservation(id, data, user);
  return NextResponse.json({ reservation });
});
