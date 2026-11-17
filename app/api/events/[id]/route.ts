import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { AppError, handle, parseBody, parseId } from "@/lib/api";
import { MANAGERS, requireUser } from "@/lib/authz";
import { eventSchema } from "@/lib/schemas";

export const PATCH = handle(async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser(MANAGERS);
  const id = parseId((await ctx.params).id);
  const { data, error } = await parseBody(request, eventSchema);
  if (error) return error;
  const [row] = await db.update(events).set(data).where(eq(events.id, id)).returning({ id: events.id });
  if (!row) throw new AppError("Event not found", 404);
  return NextResponse.json({ ok: true });
});

export const DELETE = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser(MANAGERS);
  const id = parseId((await ctx.params).id);
  await db.update(events).set({ deletedAt: new Date() }).where(eq(events.id, id));
  return NextResponse.json({ ok: true });
});
