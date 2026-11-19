import { NextResponse } from "next/server";
import { handle, parseBody } from "@/lib/api";
import { createReservation, reservationSchema } from "@/lib/reservations";

/** Website table booking. Lands on the staff Reservations page as "pending" and notifies managers. */
export const POST = handle(async (request: Request) => {
  const { data, error } = await parseBody(request, reservationSchema);
  if (error) return error;
  // Honeypot filled in: a bot. Pretend it worked so it doesn't retry.
  if (data.website) return NextResponse.json({ reference: "R00000", night: data.night, arrivalTime: data.arrivalTime }, { status: 201 });
  const { reservation: r, duplicate } = await createReservation(data, "website");
  return NextResponse.json(
    { reference: r.reference, night: r.night, arrivalTime: r.arrivalTime, partySize: r.partySize, name: r.name },
    { status: duplicate ? 200 : 201 },
  );
});
