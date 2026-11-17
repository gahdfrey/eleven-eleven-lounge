import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { AppError, handle, parseBody, parseId } from "@/lib/api";
import { MANAGERS, requireUser } from "@/lib/authz";
import { categorySchema } from "@/lib/schemas";

export const PATCH = handle(async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser(MANAGERS);
  const id = parseId((await ctx.params).id);
  const { data, error } = await parseBody(request, categorySchema.partial());
  if (error) return error;
  const [row] = await db.update(categories).set(data).where(eq(categories.id, id)).returning({ id: categories.id });
  if (!row) throw new AppError("Category not found", 404);
  return NextResponse.json({ ok: true });
});

/** Soft delete; its items fall under "Other" on the menu. */
export const DELETE = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser(MANAGERS);
  const id = parseId((await ctx.params).id);
  await db.update(categories).set({ deletedAt: new Date() }).where(eq(categories.id, id));
  return NextResponse.json({ ok: true });
});
