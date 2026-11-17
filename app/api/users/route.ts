import { NextResponse } from "next/server";
import { z } from "zod";
import { handle, parseBody, AppError } from "@/lib/api";
import { requireUser } from "@/lib/authz";
import { ROLES } from "@/lib/db/schema";
import { pgError } from "@/lib/db/errors";
import { createUserWithSequence, DEFAULT_PASSWORD } from "@/lib/users";

const schema = z.object({
  firstname: z.string().trim().min(2, "First name is required").max(40),
  lastname: z.string().trim().min(2, "Last name is required").max(40),
  role: z.enum(ROLES),
  phone: z.string().trim().max(20).optional(),
  email: z.union([z.email("Enter a valid email").trim().toLowerCase(), z.literal("")]).optional(),
});

/** Admin creates an account: username 11:11/<next number>, default password, must change on first login. */
export const POST = handle(async (request: Request) => {
  await requireUser(["admin"]);
  const { data, error } = await parseBody(request, schema);
  if (error) return error;
  try {
    const user = await createUserWithSequence(data);
    return NextResponse.json({ user: { ...user, password: DEFAULT_PASSWORD } }, { status: 201 });
  } catch (err) {
    if (pgError(err)?.constraint === "users_email_unique") throw new AppError("That email is already used by another account.", 409);
    throw err;
  }
});
