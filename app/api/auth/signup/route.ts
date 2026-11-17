import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError, handle, parseBody } from "@/lib/api";
import { countUsers, createUserWithSequence, PASSWORD_RULES } from "@/lib/users";

const schema = z
  .object({
    firstname: z.string().trim().min(2, "First name must be at least 2 characters"),
    lastname: z.string().trim().min(2, "Last name must be at least 2 characters"),
    email: z.email("Valid email is required").trim().toLowerCase(),
    password: z.string().regex(PASSWORD_RULES.regex, PASSWORD_RULES.message),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" });

/** One-time owner setup: only works while there are no accounts. Everyone else is created by an admin. */
export const POST = handle(async (request: Request) => {
  if ((await countUsers()) > 0) throw new AppError("Sign-up is closed. Ask an admin to create your account.", 403);
  const { data, error } = await parseBody(request, schema);
  if (error) return error;
  const user = await createUserWithSequence({ ...data, role: "admin", mustChangePassword: false });
  return NextResponse.json({ user }, { status: 201 });
});
