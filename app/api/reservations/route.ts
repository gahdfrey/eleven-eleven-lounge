import { NextResponse } from "next/server";
import { handle, parseBody } from "@/lib/api";
import { SERVICE, requireUser } from "@/lib/authz";
import { createReservation, reservationSchema } from "@/lib/reservations";

/** Staff add a booking taken by phone, WhatsApp or at the door. It starts confirmed. */
export const POST = handle(async (request: Request) => {
  const user = await requireUser(SERVICE);
  const { data, error } = await parseBody(request, reservationSchema);
  if (error) return error;
  const { reservation } = await createReservation({ ...data, website: undefined }, "staff", user);
  return NextResponse.json({ reservation }, { status: 201 });
});
