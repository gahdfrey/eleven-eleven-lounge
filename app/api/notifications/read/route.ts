import { NextResponse } from "next/server";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { handle, parseBody } from "@/lib/api";
import { requireUser } from "@/lib/authz";

const schema = z.object({ ids: z.array(z.number().int()).max(100).optional() });

/** Marks the given notifications (or all) as read. */
export const POST = handle(async (request: Request) => {
  const user = await requireUser();
  const { data, error } = await parseBody(request, schema);
  if (error) return error;
  const conditions = [eq(notifications.userId, user.id), isNull(notifications.readAt)];
  if (data.ids?.length) conditions.push(inArray(notifications.id, data.ids));
  await db.update(notifications).set({ readAt: new Date() }).where(and(...conditions));
  return NextResponse.json({ ok: true });
});
