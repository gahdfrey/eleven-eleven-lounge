import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { loungeTables } from "@/lib/db/schema";
import { AppError, handle, parseBody, parseId } from "@/lib/api";
import { MANAGERS, requireUser } from "@/lib/authz";
import { randomToken } from "@/lib/tokens";

const schema = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  active: z.boolean().optional(),
  /** Issue a new QR code; the old printed one stops working. */
  regenerate: z.boolean().optional(),
});

export const PATCH = handle(async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser(MANAGERS);
  const id = parseId((await ctx.params).id);
  const { data, error } = await parseBody(request, schema);
  if (error) return error;
  const { regenerate, ...rest } = data;
  const [row] = await db
    .update(loungeTables)
    .set({ ...rest, ...(regenerate ? { qrToken: randomToken() } : {}) })
    .where(eq(loungeTables.id, id))
    .returning({ id: loungeTables.id });
  if (!row) throw new AppError("Table not found", 404);
  return NextResponse.json({ ok: true });
});

export const DELETE = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser(MANAGERS);
  const id = parseId((await ctx.params).id);
  await db.update(loungeTables).set({ deletedAt: new Date(), active: false }).where(eq(loungeTables.id, id));
  return NextResponse.json({ ok: true });
});
