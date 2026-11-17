import { NextResponse } from "next/server";
import { eventSchema } from "@/lib/schemas";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { handle, parseBody } from "@/lib/api";
import { MANAGERS, requireUser } from "@/lib/authz";


export const POST = handle(async (request: Request) => {
  await requireUser(MANAGERS);
  const { data, error } = await parseBody(request, eventSchema);
  if (error) return error;
  const [event] = await db.insert(events).values(data).returning();
  return NextResponse.json({ event }, { status: 201 });
});
