import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users, ROLES } from "@/lib/db/schema";
import { AppError, handle, parseBody, parseId } from "@/lib/api";
import { requireUser } from "@/lib/authz";

const schema = z.object({
  firstname: z.string().trim().min(2).max(40).optional(),
  lastname: z.string().trim().min(2).max(40).optional(),
  phone: z.string().trim().max(20).nullable().optional(),
  role: z.enum(ROLES).optional(),
  active: z.boolean().optional(),
});

export const PATCH = handle(async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const admin = await requireUser(["admin"]);
  const id = parseId((await ctx.params).id);
  const { data, error } = await parseBody(request, schema);
  if (error) return error;
  if (id === admin.id && (data.active === false || (data.role && data.role !== "admin"))) {
    throw new AppError("You can't deactivate or demote your own account.");
  }
  const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning({ id: users.id });
  if (!updated) throw new AppError("User not found", 404);
  return NextResponse.json({ ok: true });
});
