import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { AppError, handle, parseBody } from "@/lib/api";
import { requireUser } from "@/lib/authz";
import { DEFAULT_PASSWORD, hashPassword, PASSWORD_RULES, verifyPassword } from "@/lib/users";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().regex(PASSWORD_RULES.regex, PASSWORD_RULES.message),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" })
  .refine((d) => d.newPassword !== DEFAULT_PASSWORD, { path: ["newPassword"], message: "Choose a password other than the default" });

export const POST = handle(async (request: Request) => {
  const user = await requireUser();
  const { data, error } = await parseBody(request, schema);
  if (error) return error;
  const [row] = await db.select({ password: users.password }).from(users).where(eq(users.id, user.id));
  if (!row || !(await verifyPassword(data.currentPassword, row.password))) {
    throw new AppError("Your current password is incorrect.");
  }
  await db
    .update(users)
    .set({ password: await hashPassword(data.newPassword), mustChangePassword: false })
    .where(eq(users.id, user.id));
  return NextResponse.json({ ok: true });
});
