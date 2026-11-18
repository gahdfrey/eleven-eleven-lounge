import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { remittances, users } from "@/lib/db/schema";
import { AppError, handle, parseBody } from "@/lib/api";
import { FINANCE, requireUser } from "@/lib/authz";
import { notify } from "@/lib/notifications";
import { formatNaira } from "@/lib/money";

const schema = z.object({
  staffId: z.number().int().positive(),
  amount: z.number().int().positive("Enter the amount received"),
  note: z.string().trim().max(200).optional(),
});

/** Manager or finance records cash handed over by a staff member. */
export const POST = handle(async (request: Request) => {
  const manager = await requireUser(FINANCE);
  const { data, error } = await parseBody(request, schema);
  if (error) return error;
  const [staff] = await db.select({ id: users.id }).from(users).where(eq(users.id, data.staffId));
  if (!staff) throw new AppError("Staff member not found", 404);
  const [row] = await db
    .insert(remittances)
    .values({ staffId: data.staffId, amount: data.amount, note: data.note || null, receivedById: manager.id })
    .returning();
  if (data.staffId !== manager.id) {
    await notify(data.staffId, {
      title: "Remittance recorded",
      body: `${manager.firstname} received ${formatNaira(data.amount)} from you.`,
      link: "/dashboard",
    });
  }
  return NextResponse.json({ remittance: row }, { status: 201 });
});
