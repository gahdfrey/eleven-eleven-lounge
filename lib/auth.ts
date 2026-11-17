import bcrypt from "bcryptjs";
import { and, count, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db";
import { users } from "./db/schema";

export const signupSchema = z
  .object({
    firstname: z.string().trim().min(2, "First name must be at least 2 characters"),
    lastname: z.string().trim().min(2, "Last name must be at least 2 characters"),
    email: z.email("Valid email is required").trim().toLowerCase(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain uppercase, lowercase, and number"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export type SignupInput = z.infer<typeof signupSchema>;

export async function getUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), isNull(users.deletedAt)))
    .limit(1);
  return user;
}

export async function verifyPassword(password: string, hashed: string) {
  return bcrypt.compare(password, hashed);
}

/** Creates a user; the very first account becomes admin, the rest staff. */
export async function createUser(data: Omit<SignupInput, "confirmPassword">) {
  const hashed = await bcrypt.hash(data.password, 10);
  const [{ n }] = await db.select({ n: count() }).from(users);
  const [user] = await db
    .insert(users)
    .values({
      firstname: data.firstname,
      lastname: data.lastname,
      email: data.email,
      password: hashed,
      role: n === 0 ? "admin" : "staff",
    })
    .returning({ id: users.id, email: users.email, role: users.role });
  return user;
}
