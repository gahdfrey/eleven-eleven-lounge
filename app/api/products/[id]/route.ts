import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { AppError, handle, parseBody, parseId } from "@/lib/api";
import { MANAGERS, requireUser } from "@/lib/authz";
import { productSchema } from "@/lib/schemas";

/** Edits details only — stock changes go through /stock so they're always on the ledger. */
export const PATCH = handle(async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser(MANAGERS);
  const id = parseId((await ctx.params).id);
  const { data, error } = await parseBody(request, productSchema.partial());
  if (error) return error;
  const [row] = await db.update(products).set(data).where(eq(products.id, id)).returning({ id: products.id });
  if (!row) throw new AppError("Item not found", 404);
  return NextResponse.json({ ok: true });
});

export const DELETE = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser(MANAGERS);
  const id = parseId((await ctx.params).id);
  await db.update(products).set({ deletedAt: new Date(), available: false }).where(eq(products.id, id));
  return NextResponse.json({ ok: true });
});
