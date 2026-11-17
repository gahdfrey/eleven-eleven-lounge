import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { AppError, handle, parseId } from "@/lib/api";
import { requireUser } from "@/lib/authz";
import { DEFAULT_PASSWORD, hashPassword } from "@/lib/users";

/** Resets to the default password; the user must choose a new one at next login. */
export const POST = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser(["admin"]);
  const id = parseId((await ctx.params).id);
  const [updated] = await db
    .update(users)
    .set({ password: await hashPassword(DEFAULT_PASSWORD), mustChangePassword: true })
    .where(eq(users.id, id))
    .returning({ username: users.username });
  if (!updated) throw new AppError("User not found", 404);
  return NextResponse.json({ username: updated.username, password: DEFAULT_PASSWORD });
});
