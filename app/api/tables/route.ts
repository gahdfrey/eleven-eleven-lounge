import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { loungeTables } from "@/lib/db/schema";
import { handle, parseBody } from "@/lib/api";
import { MANAGERS, requireUser } from "@/lib/authz";
import { randomToken } from "@/lib/tokens";

export const POST = handle(async (request: Request) => {
  await requireUser(MANAGERS);
  const { data, error } = await parseBody(request, z.object({ name: z.string().trim().min(1, "Name is required").max(40) }));
  if (error) return error;
  const [table] = await db.insert(loungeTables).values({ name: data.name, qrToken: randomToken() }).returning();
  return NextResponse.json({ table }, { status: 201 });
});
