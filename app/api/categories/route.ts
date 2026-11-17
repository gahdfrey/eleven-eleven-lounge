import { NextResponse } from "next/server";
import { categorySchema } from "@/lib/schemas";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { handle, parseBody } from "@/lib/api";
import { MANAGERS, requireUser } from "@/lib/authz";


export const POST = handle(async (request: Request) => {
  await requireUser(MANAGERS);
  const { data, error } = await parseBody(request, categorySchema);
  if (error) return error;
  const [row] = await db.insert(categories).values(data).returning();
  return NextResponse.json({ category: row }, { status: 201 });
});
